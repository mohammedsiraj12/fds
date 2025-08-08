from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
import requests

app = FastAPI()
bearer_scheme = HTTPBearer()

SUPABASE_PROJECT_ID  = 'https://xreiokflgmmpfehptddr.supabase.co'
SUPABASE_JWT_SECRET  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyZWlva2ZsZ21tcGZlaHB0ZGRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1NzUzODcsImV4cCI6MjA3MDE1MTM4N30.QgSq7oFq9vPB_t6wLPP61e9p3vQNVwFS80k9We89uGY'
def verify_jwt(token: str):
    try:
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False}
        )
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
    return verify_jwt(credentials.credentials)

@app.get("/protected")
def protected_route(user=Depends(get_current_user)):
    return {"message": "You are authenticated!", "user": user}