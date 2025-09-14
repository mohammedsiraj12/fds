from pydantic import BaseModel

class ConsultationCreate(BaseModel):
    patient_id: str
    question: str
    symptoms: str
    status: str = "pending"

class ConsultationResponse(BaseModel):
    consultation_id: str
    doctor_id: str
    response: str
