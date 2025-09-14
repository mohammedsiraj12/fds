from pydantic import BaseModel

class AppointmentCreate(BaseModel):
    patient_id: str
    appointment_date: str
    appointment_time: str
    appointment_type: str
    status: str = "pending"
