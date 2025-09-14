from fastapi import APIRouter, HTTPException
from models.consultation import ConsultationCreate, ConsultationResponse
from database.connection import run_query

router = APIRouter(prefix="/consultations", tags=["consultations"])

@router.post("")
def create_consultation(consultation: ConsultationCreate):
    query = """
    MATCH (p:Patient {user_id: $patient_id})
    CREATE (c:Consultation {
        id: randomUUID(),
        patient_id: $patient_id,
        question: $question,
        symptoms: $symptoms,
        status: $status,
        created_at: datetime()
    })
    CREATE (p)-[:HAS_CONSULTATION]->(c)
    RETURN c
    """
    result = run_query(query, consultation.dict())
    if result:
        return {"success": True, "consultation": result[0]}
    raise HTTPException(status_code=400, detail="Failed to create consultation")

@router.get("/patient/{patient_id}")
def get_patient_consultations(patient_id: str):
    query = """
    MATCH (p:Patient {user_id: $patient_id})-[:HAS_CONSULTATION]->(c:Consultation)
    OPTIONAL MATCH (c)<-[:RESPONDED_TO]-(d:Doctor)
    RETURN c, d
    ORDER BY c.created_at DESC
    """
    result = run_query(query, {"patient_id": patient_id})
    return {"consultations": result}

@router.get("/doctor/{doctor_id}")
def get_doctor_consultations(doctor_id: str):
    query = """
    MATCH (d:Doctor {user_id: $doctor_id})-[:RESPONDED_TO]->(c:Consultation)
    MATCH (c)<-[:HAS_CONSULTATION]-(p:Patient)
    RETURN c, p
    ORDER BY c.created_at DESC
    """
    result = run_query(query, {"doctor_id": doctor_id})
    return {"consultations": result}

@router.get("/pending")
def get_pending_consultations():
    query = """
    MATCH (c:Consultation {status: 'pending'})
    MATCH (c)<-[:HAS_CONSULTATION]-(p:Patient)
    WHERE NOT (c)<-[:RESPONDED_TO]-(:Doctor)
    RETURN c, p
    ORDER BY c.created_at DESC
    """
    result = run_query(query)
    return {"consultations": result}

@router.put("/{consultation_id}/respond")
def respond_to_consultation(consultation_id: str, response_data: ConsultationResponse):
    query = """
    MATCH (c:Consultation {id: $consultation_id})
    MATCH (d:Doctor {user_id: $doctor_id})
    SET c.response = $response,
        c.status = 'answered',
        c.answered_at = datetime()
    CREATE (d)-[:RESPONDED_TO]->(c)
    RETURN c
    """
    params = {
        "consultation_id": consultation_id,
        "doctor_id": response_data.doctor_id,
        "response": response_data.response
    }
    result = run_query(query, params)
    if result:
        return {"success": True, "consultation": result[0]}
    raise HTTPException(status_code=404, detail="Consultation not found")

@router.get("")
def get_all_consultations():
    query = """
    MATCH (c:Consultation)
    MATCH (c)<-[:HAS_CONSULTATION]-(p:Patient)
    OPTIONAL MATCH (c)<-[:RESPONDED_TO]-(d:Doctor)
    RETURN c, p, d
    ORDER BY c.created_at DESC
    """
    result = run_query(query)
    return {"consultations": result}
