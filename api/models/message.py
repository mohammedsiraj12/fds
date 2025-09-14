from pydantic import BaseModel

class MessageCreate(BaseModel):
    consultation_id: str
    sender_id: str
    sender_role: str
    message: str
