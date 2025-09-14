from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
from pydantic import BaseModel

from auth.utils import get_current_user
from database.connection import driver

router = APIRouter(prefix="/prescriptions", tags=["prescriptions"])

class MedicationItem(BaseModel):
    name: str
    dosage: str
    frequency: str  # e.g., "2 times daily"
    duration: str   # e.g., "7 days"
    instructions: Optional[str] = None

class PrescriptionCreate(BaseModel):
    patient_id: str
    consultation_id: str
    medications: List[MedicationItem]
    general_instructions: Optional[str] = None
    follow_up_required: bool = False
    follow_up_days: Optional[int] = None

class PrescriptionUpdate(BaseModel):
    medications: Optional[List[MedicationItem]] = None
    general_instructions: Optional[str] = None
    follow_up_required: Optional[bool] = None
    follow_up_days: Optional[int] = None
    status: Optional[str] = None  # active, completed, cancelled

@router.post("/create")
def create_prescription(
    prescription_data: PrescriptionCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new prescription (doctors only)"""
    if current_user["role"] != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can create prescriptions")
    
    try:
        with driver.session() as session:
            # Verify consultation exists and doctor has access
            consultation_check = session.run(
                """
                MATCH (c:Consultation {id: $consultation_id})
                MATCH (d:Doctor {user_id: $doctor_id})-[:RESPONDED_TO]->(c)
                RETURN c
                """,
                consultation_id=prescription_data.consultation_id,
                doctor_id=current_user["id"]
            )
            
            if not consultation_check.single():
                raise HTTPException(status_code=403, detail="Access denied or consultation not found")
            
            prescription_id = str(uuid.uuid4())
            
            # Create prescription
            result = session.run(
                """
                CREATE (p:Prescription {
                    id: $prescription_id,
                    patient_id: $patient_id,
                    doctor_id: $doctor_id,
                    consultation_id: $consultation_id,
                    medications: $medications,
                    general_instructions: $general_instructions,
                    follow_up_required: $follow_up_required,
                    follow_up_days: $follow_up_days,
                    status: 'active',
                    created_at: datetime(),
                    updated_at: datetime()
                })
                RETURN p
                """,
                prescription_id=prescription_id,
                patient_id=prescription_data.patient_id,
                doctor_id=current_user["id"],
                consultation_id=prescription_data.consultation_id,
                medications=[med.dict() for med in prescription_data.medications],
                general_instructions=prescription_data.general_instructions,
                follow_up_required=prescription_data.follow_up_required,
                follow_up_days=prescription_data.follow_up_days
            )
            
            prescription_record = result.single()
            if prescription_record:
                prescription_dict = dict(prescription_record["p"])
                prescription_dict['created_at'] = str(prescription_dict['created_at'])
                prescription_dict['updated_at'] = str(prescription_dict['updated_at'])
                
                return {
                    "success": True,
                    "message": "Prescription created successfully",
                    "prescription": prescription_dict
                }
            else:
                raise HTTPException(status_code=500, detail="Failed to create prescription")
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/my-prescriptions")
def get_my_prescriptions(
    current_user: dict = Depends(get_current_user),
    status: Optional[str] = Query(None),
    limit: int = Query(20, le=100)
):
    """Get prescriptions for current user"""
    try:
        with driver.session() as session:
            if current_user["role"] == "patient":
                query = """
                MATCH (p:Prescription {patient_id: $user_id})
                OPTIONAL MATCH (d:Doctor {user_id: p.doctor_id})
                OPTIONAL MATCH (du:User {id: p.doctor_id})
                """
                if status:
                    query += " WHERE p.status = $status"
                query += " RETURN p, d, du ORDER BY p.created_at DESC LIMIT $limit"
                
            elif current_user["role"] == "doctor":
                query = """
                MATCH (p:Prescription {doctor_id: $user_id})
                OPTIONAL MATCH (pat:Patient {user_id: p.patient_id})
                OPTIONAL MATCH (pu:User {id: p.patient_id})
                """
                if status:
                    query += " WHERE p.status = $status"
                query += " RETURN p, pat, pu ORDER BY p.created_at DESC LIMIT $limit"
            else:
                raise HTTPException(status_code=403, detail="Access denied")
            
            params = {"user_id": current_user["id"], "limit": limit}
            if status:
                params["status"] = status
                
            result = session.run(query, params)
            
            prescriptions = []
            for record in result:
                prescription = dict(record["p"])
                # Convert datetime fields
                for field in ['created_at', 'updated_at']:
                    if field in prescription and prescription[field]:
                        prescription[field] = str(prescription[field])
                
                if current_user["role"] == "patient":
                    doctor = dict(record["d"]) if record["d"] else None
                    doctor_user = dict(record["du"]) if record["du"] else None
                    prescriptions.append({
                        "prescription": prescription,
                        "doctor": doctor,
                        "doctor_user": doctor_user
                    })
                else:
                    patient = dict(record["pat"]) if record["pat"] else None
                    patient_user = dict(record["pu"]) if record["pu"] else None
                    prescriptions.append({
                        "prescription": prescription,
                        "patient": patient,
                        "patient_user": patient_user
                    })
            
            return {"prescriptions": prescriptions}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{prescription_id}")
def get_prescription_details(
    prescription_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get detailed prescription information"""
    try:
        with driver.session() as session:
            # Check access permissions
            access_query = """
            MATCH (p:Prescription {id: $prescription_id})
            WHERE p.patient_id = $user_id OR p.doctor_id = $user_id
            RETURN p
            """
            
            access_result = session.run(access_query, 
                prescription_id=prescription_id, 
                user_id=current_user["id"]
            )
            
            if not access_result.single():
                raise HTTPException(status_code=403, detail="Access denied")
            
            # Get full prescription details
            detail_query = """
            MATCH (p:Prescription {id: $prescription_id})
            OPTIONAL MATCH (d:Doctor {user_id: p.doctor_id})
            OPTIONAL MATCH (du:User {id: p.doctor_id})
            OPTIONAL MATCH (pat:Patient {user_id: p.patient_id})
            OPTIONAL MATCH (pu:User {id: p.patient_id})
            OPTIONAL MATCH (c:Consultation {id: p.consultation_id})
            RETURN p, d, du, pat, pu, c
            """
            
            result = session.run(detail_query, prescription_id=prescription_id)
            record = result.single()
            
            if record:
                prescription = dict(record["p"])
                # Convert datetime fields
                for field in ['created_at', 'updated_at']:
                    if field in prescription and prescription[field]:
                        prescription[field] = str(prescription[field])
                
                return {
                    "prescription": prescription,
                    "doctor": dict(record["d"]) if record["d"] else None,
                    "doctor_user": dict(record["du"]) if record["du"] else None,
                    "patient": dict(record["pat"]) if record["pat"] else None,
                    "patient_user": dict(record["pu"]) if record["pu"] else None,
                    "consultation": dict(record["c"]) if record["c"] else None
                }
            else:
                raise HTTPException(status_code=404, detail="Prescription not found")
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{prescription_id}")
def update_prescription(
    prescription_id: str,
    update_data: PrescriptionUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update prescription (doctors only)"""
    if current_user["role"] != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can update prescriptions")
    
    try:
        with driver.session() as session:
            # Check if prescription exists and doctor has access
            access_query = """
            MATCH (p:Prescription {id: $prescription_id})
            WHERE p.doctor_id = $doctor_id
            RETURN p
            """
            
            access_result = session.run(access_query, 
                prescription_id=prescription_id, 
                doctor_id=current_user["id"]
            )
            
            if not access_result.single():
                raise HTTPException(status_code=403, detail="Access denied")
            
            # Build update query
            set_clauses = ["p.updated_at = datetime()"]
            params = {"prescription_id": prescription_id}
            
            if update_data.medications is not None:
                set_clauses.append("p.medications = $medications")
                params["medications"] = [med.dict() for med in update_data.medications]
            
            if update_data.general_instructions is not None:
                set_clauses.append("p.general_instructions = $general_instructions")
                params["general_instructions"] = update_data.general_instructions
            
            if update_data.follow_up_required is not None:
                set_clauses.append("p.follow_up_required = $follow_up_required")
                params["follow_up_required"] = update_data.follow_up_required
            
            if update_data.follow_up_days is not None:
                set_clauses.append("p.follow_up_days = $follow_up_days")
                params["follow_up_days"] = update_data.follow_up_days
            
            if update_data.status is not None:
                set_clauses.append("p.status = $status")
                params["status"] = update_data.status
            
            update_query = f"""
            MATCH (p:Prescription {{id: $prescription_id}})
            SET {', '.join(set_clauses)}
            RETURN p
            """
            
            result = session.run(update_query, params)
            
            updated_prescription = result.single()
            if updated_prescription:
                prescription_dict = dict(updated_prescription["p"])
                # Convert datetime fields
                for field in ['created_at', 'updated_at']:
                    if field in prescription_dict and prescription_dict[field]:
                        prescription_dict[field] = str(prescription_dict[field])
                
                return {
                    "success": True,
                    "message": "Prescription updated successfully",
                    "prescription": prescription_dict
                }
            else:
                raise HTTPException(status_code=500, detail="Failed to update prescription")
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{prescription_id}/mark-completed")
def mark_prescription_completed(
    prescription_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Mark prescription as completed (patients can mark their own prescriptions)"""
    try:
        with driver.session() as session:
            # Check access permissions
            access_query = """
            MATCH (p:Prescription {id: $prescription_id})
            WHERE p.patient_id = $user_id OR p.doctor_id = $user_id
            RETURN p
            """
            
            access_result = session.run(access_query, 
                prescription_id=prescription_id, 
                user_id=current_user["id"]
            )
            
            if not access_result.single():
                raise HTTPException(status_code=403, detail="Access denied")
            
            # Mark as completed
            result = session.run(
                """
                MATCH (p:Prescription {id: $prescription_id})
                SET p.status = 'completed',
                    p.completed_at = datetime(),
                    p.updated_at = datetime()
                RETURN p
                """,
                prescription_id=prescription_id
            )
            
            prescription_record = result.single()
            if prescription_record:
                prescription_dict = dict(prescription_record["p"])
                # Convert datetime fields
                for field in ['created_at', 'updated_at', 'completed_at']:
                    if field in prescription_dict and prescription_dict[field]:
                        prescription_dict[field] = str(prescription_dict[field])
                
                return {
                    "success": True,
                    "message": "Prescription marked as completed",
                    "prescription": prescription_dict
                }
            else:
                raise HTTPException(status_code=500, detail="Failed to update prescription")
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats/dashboard")
def get_prescription_stats(current_user: dict = Depends(get_current_user)):
    """Get prescription statistics for dashboard"""
    try:
        with driver.session() as session:
            if current_user["role"] == "patient":
                result = session.run(
                    """
                    MATCH (p:Prescription {patient_id: $user_id})
                    RETURN 
                        count(p) as total,
                        count(CASE WHEN p.status = 'active' THEN 1 END) as active,
                        count(CASE WHEN p.status = 'completed' THEN 1 END) as completed,
                        count(CASE WHEN p.follow_up_required = true THEN 1 END) as follow_up_needed
                    """,
                    user_id=current_user["id"]
                )
            elif current_user["role"] == "doctor":
                result = session.run(
                    """
                    MATCH (p:Prescription {doctor_id: $user_id})
                    RETURN 
                        count(p) as total,
                        count(CASE WHEN p.status = 'active' THEN 1 END) as active,
                        count(CASE WHEN p.status = 'completed' THEN 1 END) as completed,
                        count(CASE WHEN p.follow_up_required = true THEN 1 END) as follow_up_needed
                    """,
                    user_id=current_user["id"]
                )
            else:
                # Admin stats
                result = session.run(
                    """
                    MATCH (p:Prescription)
                    RETURN 
                        count(p) as total,
                        count(CASE WHEN p.status = 'active' THEN 1 END) as active,
                        count(CASE WHEN p.status = 'completed' THEN 1 END) as completed,
                        count(CASE WHEN p.follow_up_required = true THEN 1 END) as follow_up_needed
                    """
                )
            
            stats = result.single()
            return dict(stats) if stats else {}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
