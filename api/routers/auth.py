from fastapi import APIRouter, HTTPException, Depends, status
from datetime import timedelta
import uuid

from models.user import UserCreate, UserLogin, Token
from auth.utils import get_password_hash, verify_password, create_access_token, get_current_user
from config.settings import ACCESS_TOKEN_EXPIRE_MINUTES
from database.connection import driver

router = APIRouter(prefix="/auth", tags=["authentication"])

@router.post("/signup", response_model=Token)
def signup(user: UserCreate):
    with driver.session() as session:
        # Check if user already exists
        result = session.run(
            "MATCH (u:User {email: $email}) RETURN u",
            email=user.email
        )
        if result.single():
            raise HTTPException(
                status_code=400,
                detail="Email already registered"
            )
        
        # Create new user
        user_id = str(uuid.uuid4())
        hashed_password = get_password_hash(user.password)
        
        result = session.run(
            """
            CREATE (u:User {
                id: $user_id,
                email: $email,
                password: $password,
                role: $role,
                created_at: datetime()
            })
            RETURN u
            """,
            user_id=user_id,
            email=user.email,
            password=hashed_password,
            role=user.role
        )
        
        user_record = result.single()["u"]
        user_dict = dict(user_record)
        del user_dict["password"]  # Don't return password
        
        # Convert Neo4j DateTime to string
        if 'created_at' in user_dict:
            user_dict['created_at'] = str(user_dict['created_at'])
        
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.email}, expires_delta=access_token_expires
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": user_dict
        }

@router.post("/login", response_model=Token)
def login(user: UserLogin):
    with driver.session() as session:
        result = session.run(
            "MATCH (u:User {email: $email}) RETURN u",
            email=user.email
        )
        record = result.single()
        
        if not record or not verify_password(user.password, record["u"]["password"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        user_dict = dict(record["u"])
        del user_dict["password"]  # Don't return password
        
        # Convert Neo4j DateTime to string
        if 'created_at' in user_dict:
            user_dict['created_at'] = str(user_dict['created_at'])
        
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.email}, expires_delta=access_token_expires
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": user_dict
        }

@router.get("/me")
def get_current_user_profile(current_user: dict = Depends(get_current_user)):
    return current_user
