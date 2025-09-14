from pydantic import BaseModel

class PatientCreate(BaseModel):
    user_id: str
    full_name: str
    date_of_birth: str
    gender: str
