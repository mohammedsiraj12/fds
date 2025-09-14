from fastapi import APIRouter, HTTPException
from models.doctor import DoctorCreate
from database.connection import run_query

router = APIRouter(prefix="/doctors", tags=["doctors"])

@router.post("")
def create_doctor(doctor: DoctorCreate):
    query = """
    CREATE (d:Doctor {
        user_id: $user_id,
        full_name: $full_name,
        specialization: $specialization,
        license_number: $license_number,
        created_at: datetime()
    })
    RETURN d
    """
    result = run_query(query, doctor.dict())
    if result:
        return {"success": True, "doctor": result[0]}
    raise HTTPException(status_code=400, detail="Failed to create doctor")

@router.get("/{user_id}")
def get_doctor(user_id: str):
    query = "MATCH (d:Doctor {user_id: $user_id}) RETURN d"
    result = run_query(query, {"user_id": user_id})
    if result:
        return result[0]
    raise HTTPException(status_code=404, detail="Doctor not found")

@router.get("")
def get_all_doctors():
    query = "MATCH (d:Doctor) RETURN d ORDER BY d.created_at DESC"
    result = run_query(query)
    return {"doctors": result}
