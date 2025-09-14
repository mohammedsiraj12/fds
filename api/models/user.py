from pydantic import BaseModel

class UserCreate(BaseModel):
    email: str
    password: str
    role: str = "patient"  # patient, doctor, admin

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict
