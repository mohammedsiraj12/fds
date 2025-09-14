from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
from pydantic import BaseModel

from auth.utils import get_current_user, get_password_hash, verify_password, create_access_token
from database.connection import driver

router = APIRouter(prefix="/consultations", tags=["consultations"])

# Enhanced Models
class ConsultationCreate(BaseModel):
    question: str
    symptoms: str
    severity: str = "medium"  # low, medium, high
    category: str = "general"  # general, emergency, followup
    preferred_doctor_id: Optional[str] = None

class ConsultationUpdate(BaseModel):
    response: str
    diagnosis: Optional[str] = None
    prescription: Optional[str] = None
    follow_up_needed: bool = False
    follow_up_date: Optional[str] = None

class MessageCreate(BaseModel):
    message: str
    sender_role: str  # patient, doctor

# Convert Neo4j DateTime to string
def serialize_consultation(record):
    consultation = dict(record["c"]) if "c" in record else {}
    patient = dict(record["p"]) if "p" in record else {}
    doctor = dict(record["d"]) if "d" in record else {}
    
    # Convert datetime objects
    for item in [consultation, patient, doctor]:
        for key, value in item.items():
            if hasattr(value, 'iso_format'):  # Neo4j datetime
                item[key] = str(value)
    
    return {
        "consultation": consultation,
        "patient": patient,
        "doctor": doctor
    }

@router.post("/create")
def create_consultation(
    consultation_data: ConsultationCreate, 
    current_user: dict = Depends(get_current_user)
):
    """Create a new consultation"""
    if current_user["role"] != "patient":
        raise HTTPException(status_code=403, detail="Only patients can create consultations")
    
    try:
        with driver.session() as session:
            # Create consultation
            consultation_id = str(uuid.uuid4())
            result = session.run(
                """
                CREATE (c:Consultation {
                    id: $consultation_id,
                    patient_id: $patient_id,
                    question: $question,
                    symptoms: $symptoms,
                    severity: $severity,
                    category: $category,
                    preferred_doctor_id: $preferred_doctor_id,
                    status: 'pending',
                    created_at: datetime(),
                    updated_at: datetime()
                })
                RETURN c
                """,
                consultation_id=consultation_id,
                patient_id=current_user["id"],
                question=consultation_data.question,
                symptoms=consultation_data.symptoms,
                severity=consultation_data.severity,
                category=consultation_data.category,
                preferred_doctor_id=consultation_data.preferred_doctor_id
            )
            
            consultation_record = result.single()
            if consultation_record:
                consultation_dict = dict(consultation_record["c"])
                consultation_dict['created_at'] = str(consultation_dict['created_at'])
                consultation_dict['updated_at'] = str(consultation_dict['updated_at'])
                return {
                    "success": True,
                    "message": "Consultation created successfully",
                    "consultation": consultation_dict
                }
            else:
                raise HTTPException(status_code=500, detail="Failed to create consultation")
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/my-consultations")
def get_my_consultations(
    current_user: dict = Depends(get_current_user),
    status_filter: Optional[str] = Query(None),
    limit: int = Query(20, le=100)
):
    """Get consultations for current user"""
    try:
        with driver.session() as session:
            if current_user["role"] == "patient":
                query = """
                MATCH (c:Consultation {patient_id: $user_id})
                OPTIONAL MATCH (c)<-[:RESPONDED_TO]-(d:Doctor)
                OPTIONAL MATCH (d)<-[:PROFILE_OF]-(du:User)
                """
                if status_filter:
                    query += " WHERE c.status = $status"
                query += " RETURN c, d, du ORDER BY c.created_at DESC LIMIT $limit"
                
            elif current_user["role"] == "doctor":
                query = """
                MATCH (d:Doctor {user_id: $user_id})-[:RESPONDED_TO]->(c:Consultation)
                OPTIONAL MATCH (c)<-[:HAS_CONSULTATION]-(p:Patient)
                OPTIONAL MATCH (p)<-[:PROFILE_OF]-(pu:User)
                """
                if status_filter:
                    query += " WHERE c.status = $status"
                query += " RETURN c, p, pu ORDER BY c.created_at DESC LIMIT $limit"
            else:
                raise HTTPException(status_code=403, detail="Access denied")
            
            params = {"user_id": current_user["id"], "limit": limit}
            if status_filter:
                params["status"] = status_filter
                
            result = session.run(query, params)
            
            consultations = []
            for record in result:
                consultation = dict(record["c"]) if record["c"] else {}
                # Convert datetime fields
                for field in ['created_at', 'updated_at', 'answered_at']:
                    if field in consultation and consultation[field]:
                        consultation[field] = str(consultation[field])
                
                if current_user["role"] == "patient":
                    doctor = dict(record["d"]) if record["d"] else None
                    doctor_user = dict(record["du"]) if record["du"] else None
                    consultations.append({
                        "consultation": consultation,
                        "doctor": doctor,
                        "doctor_user": doctor_user
                    })
                else:
                    patient = dict(record["p"]) if record["p"] else None
                    patient_user = dict(record["pu"]) if record["pu"] else None
                    consultations.append({
                        "consultation": consultation,
                        "patient": patient,
                        "patient_user": patient_user
                    })
            
            return {"consultations": consultations}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/available")
def get_available_consultations(
    current_user: dict = Depends(get_current_user),
    severity: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    limit: int = Query(20, le=100)
):
    """Get available consultations for doctors to respond to"""
    if current_user["role"] != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can view available consultations")
    
    try:
        with driver.session() as session:
            query = """
            MATCH (c:Consultation {status: 'pending'})
            WHERE NOT (c)<-[:RESPONDED_TO]-(:Doctor)
            OPTIONAL MATCH (c)<-[:HAS_CONSULTATION]-(p:Patient)
            OPTIONAL MATCH (p)<-[:PROFILE_OF]-(pu:User)
            """
            
            conditions = []
            params = {"doctor_id": current_user["id"], "limit": limit}
            
            if severity:
                conditions.append("c.severity = $severity")
                params["severity"] = severity
            
            if category:
                conditions.append("c.category = $category")  
                params["category"] = category
                
            # Check if doctor has preference or specialization match
            query += """
            OPTIONAL MATCH (d:Doctor {user_id: $doctor_id})
            WHERE c.preferred_doctor_id IS NULL OR c.preferred_doctor_id = $doctor_id
            """
            
            if conditions:
                query += " AND " + " AND ".join(conditions)
                
            query += " RETURN c, p, pu ORDER BY c.created_at ASC LIMIT $limit"
            
            result = session.run(query, params)
            
            consultations = []
            for record in result:
                consultation = dict(record["c"])
                patient = dict(record["p"]) if record["p"] else {}
                patient_user = dict(record["pu"]) if record["pu"] else {}
                
                # Convert datetime fields
                for field in ['created_at', 'updated_at']:
                    if field in consultation:
                        consultation[field] = str(consultation[field])
                        
                consultations.append({
                    "consultation": consultation,
                    "patient": patient,
                    "patient_user": patient_user
                })
            
            return {"consultations": consultations}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{consultation_id}/respond")
def respond_to_consultation(
    consultation_id: str,
    response_data: ConsultationUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Doctor responds to a consultation"""
    if current_user["role"] != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can respond to consultations")
    
    try:
        with driver.session() as session:
            # Check if consultation exists and is not already answered
            check_result = session.run(
                "MATCH (c:Consultation {id: $consultation_id}) RETURN c",
                consultation_id=consultation_id
            )
            
            consultation_record = check_result.single()
            if not consultation_record:
                raise HTTPException(status_code=404, detail="Consultation not found")
            
            consultation = dict(consultation_record["c"])
            if consultation.get("status") == "completed":
                raise HTTPException(status_code=400, detail="Consultation already completed")
            
            # Update consultation with doctor's response
            update_result = session.run(
                """
                MATCH (c:Consultation {id: $consultation_id})
                MATCH (d:Doctor {user_id: $doctor_id})
                SET c.response = $response,
                    c.diagnosis = $diagnosis,
                    c.prescription = $prescription,
                    c.follow_up_needed = $follow_up_needed,
                    c.follow_up_date = $follow_up_date,
                    c.status = 'answered',
                    c.answered_at = datetime(),
                    c.updated_at = datetime()
                MERGE (d)-[:RESPONDED_TO]->(c)
                RETURN c
                """,
                consultation_id=consultation_id,
                doctor_id=current_user["id"],
                response=response_data.response,
                diagnosis=response_data.diagnosis,
                prescription=response_data.prescription,
                follow_up_needed=response_data.follow_up_needed,
                follow_up_date=response_data.follow_up_date
            )
            
            updated_consultation = update_result.single()
            if updated_consultation:
                consultation_dict = dict(updated_consultation["c"])
                # Convert datetime fields
                for field in ['created_at', 'updated_at', 'answered_at']:
                    if field in consultation_dict and consultation_dict[field]:
                        consultation_dict[field] = str(consultation_dict[field])
                
                return {
                    "success": True,
                    "message": "Response submitted successfully",
                    "consultation": consultation_dict
                }
            else:
                raise HTTPException(status_code=500, detail="Failed to update consultation")
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{consultation_id}/messages")
def get_consultation_messages(
    consultation_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get messages for a consultation"""
    try:
        with driver.session() as session:
            # Verify user has access to this consultation
            access_query = """
            MATCH (c:Consultation {id: $consultation_id})
            WHERE c.patient_id = $user_id 
               OR (c)<-[:RESPONDED_TO]-(:Doctor {user_id: $user_id})
            RETURN c
            """
            
            access_result = session.run(access_query, 
                consultation_id=consultation_id, 
                user_id=current_user["id"]
            )
            
            if not access_result.single():
                raise HTTPException(status_code=403, detail="Access denied")
            
            # Get messages
            messages_query = """
            MATCH (c:Consultation {id: $consultation_id})-[:HAS_MESSAGE]->(m:Message)
            RETURN m ORDER BY m.sent_at ASC
            """
            
            result = session.run(messages_query, consultation_id=consultation_id)
            
            messages = []
            for record in result:
                message = dict(record["m"])
                if "sent_at" in message:
                    message["sent_at"] = str(message["sent_at"])
                messages.append(message)
            
            return {"messages": messages}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{consultation_id}/messages")
def add_consultation_message(
    consultation_id: str,
    message_data: MessageCreate,
    current_user: dict = Depends(get_current_user)
):
    """Add a message to a consultation"""
    try:
        with driver.session() as session:
            # Verify user has access to this consultation
            access_query = """
            MATCH (c:Consultation {id: $consultation_id})
            WHERE c.patient_id = $user_id 
               OR (c)<-[:RESPONDED_TO]-(:Doctor {user_id: $user_id})
            RETURN c
            """
            
            access_result = session.run(access_query, 
                consultation_id=consultation_id, 
                user_id=current_user["id"]
            )
            
            if not access_result.single():
                raise HTTPException(status_code=403, detail="Access denied")
            
            # Add message
            message_id = str(uuid.uuid4())
            result = session.run(
                """
                MATCH (c:Consultation {id: $consultation_id})
                CREATE (m:Message {
                    id: $message_id,
                    consultation_id: $consultation_id,
                    sender_id: $sender_id,
                    sender_role: $sender_role,
                    message: $message,
                    sent_at: datetime()
                })
                CREATE (c)-[:HAS_MESSAGE]->(m)
                RETURN m
                """,
                consultation_id=consultation_id,
                message_id=message_id,
                sender_id=current_user["id"],
                sender_role=message_data.sender_role,
                message=message_data.message
            )
            
            message_record = result.single()
            if message_record:
                message_dict = dict(message_record["m"])
                message_dict['sent_at'] = str(message_dict['sent_at'])
                return {
                    "success": True,
                    "message": message_dict
                }
            else:
                raise HTTPException(status_code=500, detail="Failed to add message")
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{consultation_id}/close")
def close_consultation(
    consultation_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Close a consultation"""
    try:
        with driver.session() as session:
            # Verify user has access (patient or responding doctor)
            access_query = """
            MATCH (c:Consultation {id: $consultation_id})
            WHERE c.patient_id = $user_id 
               OR (c)<-[:RESPONDED_TO]-(:Doctor {user_id: $user_id})
            RETURN c
            """
            
            access_result = session.run(access_query, 
                consultation_id=consultation_id, 
                user_id=current_user["id"]
            )
            
            if not access_result.single():
                raise HTTPException(status_code=403, detail="Access denied")
            
            # Close consultation
            result = session.run(
                """
                MATCH (c:Consultation {id: $consultation_id})
                SET c.status = 'closed',
                    c.closed_at = datetime(),
                    c.updated_at = datetime()
                RETURN c
                """,
                consultation_id=consultation_id
            )
            
            consultation_record = result.single()
            if consultation_record:
                consultation_dict = dict(consultation_record["c"])
                # Convert datetime fields
                for field in ['created_at', 'updated_at', 'answered_at', 'closed_at']:
                    if field in consultation_dict and consultation_dict[field]:
                        consultation_dict[field] = str(consultation_dict[field])
                
                return {
                    "success": True,
                    "message": "Consultation closed successfully",
                    "consultation": consultation_dict
                }
            else:
                raise HTTPException(status_code=500, detail="Failed to close consultation")
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats/dashboard")
def get_consultation_stats(current_user: dict = Depends(get_current_user)):
    """Get consultation statistics for dashboard"""
    try:
        with driver.session() as session:
            if current_user["role"] == "patient":
                result = session.run(
                    """
                    MATCH (c:Consultation {patient_id: $user_id})
                    RETURN 
                        count(c) as total,
                        count(CASE WHEN c.status = 'pending' THEN 1 END) as pending,
                        count(CASE WHEN c.status = 'answered' THEN 1 END) as answered,
                        count(CASE WHEN c.status = 'closed' THEN 1 END) as closed
                    """,
                    user_id=current_user["id"]
                )
            elif current_user["role"] == "doctor":
                result = session.run(
                    """
                    MATCH (d:Doctor {user_id: $user_id})-[:RESPONDED_TO]->(c:Consultation)
                    RETURN 
                        count(c) as total,
                        count(CASE WHEN c.status = 'answered' THEN 1 END) as answered,
                        count(CASE WHEN c.status = 'closed' THEN 1 END) as closed
                    """,
                    user_id=current_user["id"]
                )
            else:
                # Admin stats
                result = session.run(
                    """
                    MATCH (c:Consultation)
                    RETURN 
                        count(c) as total,
                        count(CASE WHEN c.status = 'pending' THEN 1 END) as pending,
                        count(CASE WHEN c.status = 'answered' THEN 1 END) as answered,
                        count(CASE WHEN c.status = 'closed' THEN 1 END) as closed
                    """
                )
            
            stats = result.single()
            return dict(stats) if stats else {}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
