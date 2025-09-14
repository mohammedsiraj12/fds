from fastapi import APIRouter, HTTPException
from models.appointment import AppointmentCreate
from database.connection import run_query

router = APIRouter(prefix="/appointments", tags=["appointments"])

@router.post("")
def create_appointment(appointment: AppointmentCreate):
    query = """
    MATCH (p:Patient {user_id: $patient_id})
    CREATE (a:Appointment {
        id: randomUUID(),
        patient_id: $patient_id,
        appointment_date: $appointment_date,
        appointment_time: $appointment_time,
        appointment_type: $appointment_type,
        status: $status,
        created_at: datetime()
    })
    CREATE (p)-[:HAS_APPOINTMENT]->(a)
    RETURN a
    """
    result = run_query(query, appointment.dict())
    if result:
        return {"success": True, "appointment": result[0]}
    raise HTTPException(status_code=400, detail="Failed to create appointment")

@router.get("/patient/{patient_id}")
def get_patient_appointments(patient_id: str):
    query = """
    MATCH (p:Patient {user_id: $patient_id})-[:HAS_APPOINTMENT]->(a:Appointment)
    OPTIONAL MATCH (a)<-[:ASSIGNED_TO]-(d:Doctor)
    RETURN a, d
    ORDER BY a.appointment_date ASC
    """
    result = run_query(query, {"patient_id": patient_id})
    return {"appointments": result}

@router.get("/doctor/{doctor_id}")
def get_doctor_appointments(doctor_id: str):
    query = """
    MATCH (d:Doctor {user_id: $doctor_id})-[:ASSIGNED_TO]->(a:Appointment)
    MATCH (a)<-[:HAS_APPOINTMENT]-(p:Patient)
    RETURN a, p
    ORDER BY a.appointment_date ASC
    """
    result = run_query(query, {"doctor_id": doctor_id})
    return {"appointments": result}
