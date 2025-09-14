from pydantic import BaseModel

class DoctorCreate(BaseModel):
    user_id: str
    full_name: str
    specialization: str
    license_number: str
