from fastapi import APIRouter, HTTPException
from models.patient import PatientCreate
from database.connection import run_query

router = APIRouter(prefix="/patients", tags=["patients"])

@router.post("")
def create_patient(patient: PatientCreate):
    query = """
    CREATE (p:Patient {
        user_id: $user_id,
        full_name: $full_name,
        date_of_birth: $date_of_birth,
        gender: $gender,
        created_at: datetime()
    })
    RETURN p
    """
    result = run_query(query, patient.dict())
    if result:
        return {"success": True, "patient": result[0]}
    raise HTTPException(status_code=400, detail="Failed to create patient")

@router.get("/{user_id}")
def get_patient(user_id: str):
    query = "MATCH (p:Patient {user_id: $user_id}) RETURN p"
    result = run_query(query, {"user_id": user_id})
    if result:
        return result[0]
    raise HTTPException(status_code=404, detail="Patient not found")

@router.get("")
def get_all_patients():
    query = "MATCH (p:Patient) RETURN p ORDER BY p.created_at DESC"
    result = run_query(query)
    return {"patients": result}
