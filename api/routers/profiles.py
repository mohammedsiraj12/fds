from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Query
from typing import Optional, List
import uuid
from datetime import datetime
from pydantic import BaseModel

from auth.utils import get_current_user
from database.connection import driver
import os

router = APIRouter(prefix="/profiles", tags=["profiles"])

class PatientProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    emergency_contact: Optional[str] = None
    emergency_phone: Optional[str] = None
    blood_type: Optional[str] = None
    allergies: Optional[List[str]] = None
    medical_conditions: Optional[List[str]] = None
    current_medications: Optional[List[str]] = None
    insurance_provider: Optional[str] = None
    insurance_number: Optional[str] = None

class DoctorProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    specialization: Optional[str] = None
    license_number: Optional[str] = None
    medical_degree: Optional[str] = None
    experience_years: Optional[int] = None
    phone: Optional[str] = None
    clinic_address: Optional[str] = None
    consultation_fee: Optional[float] = None
    available_days: Optional[List[str]] = None
    available_hours: Optional[str] = None
    bio: Optional[str] = None
    certifications: Optional[List[str]] = None
    languages: Optional[List[str]] = None

@router.get("/my-profile")
def get_my_profile(current_user: dict = Depends(get_current_user)):
    """Get current user's profile"""
    try:
        with driver.session() as session:
            if current_user["role"] == "patient":
                query = """
                MATCH (u:User {id: $user_id})
                OPTIONAL MATCH (p:Patient {user_id: $user_id})
                RETURN u, p
                """
            elif current_user["role"] == "doctor":
                query = """
                MATCH (u:User {id: $user_id})
                OPTIONAL MATCH (d:Doctor {user_id: $user_id})
                RETURN u, d
                """
            else:
                query = """
                MATCH (u:User {id: $user_id})
                RETURN u, null as profile
                """
            
            result = session.run(query, user_id=current_user["id"])
            record = result.single()
            
            if record:
                user_data = dict(record["u"])
                profile_data = dict(record[1]) if record[1] else {}
                
                # Convert datetime fields
                for item in [user_data, profile_data]:
                    for field in ['created_at', 'updated_at']:
                        if field in item and item[field]:
                            item[field] = str(item[field])
                
                # Remove password from user data
                if 'password' in user_data:
                    del user_data['password']
                
                return {
                    "user": user_data,
                    "profile": profile_data
                }
            else:
                raise HTTPException(status_code=404, detail="Profile not found")
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/patient/update")
def update_patient_profile(
    profile_data: PatientProfileUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update patient profile"""
    if current_user["role"] != "patient":
        raise HTTPException(status_code=403, detail="Only patients can update patient profiles")
    
    try:
        with driver.session() as session:
            # Check if patient profile exists
            check_result = session.run(
                "MATCH (p:Patient {user_id: $user_id}) RETURN p",
                user_id=current_user["id"]
            )
            
            if check_result.single():
                # Update existing profile
                set_clauses = ["p.updated_at = datetime()"]
                params = {"user_id": current_user["id"]}
                
                for field, value in profile_data.dict(exclude_unset=True).items():
                    if value is not None:
                        set_clauses.append(f"p.{field} = ${field}")
                        params[field] = value
                
                update_query = f"""
                MATCH (p:Patient {{user_id: $user_id}})
                SET {', '.join(set_clauses)}
                RETURN p
                """
            else:
                # Create new profile
                create_query = """
                CREATE (p:Patient {
                    user_id: $user_id,
                    full_name: $full_name,
                    date_of_birth: $date_of_birth,
                    gender: $gender,
                    phone: $phone,
                    address: $address,
                    emergency_contact: $emergency_contact,
                    emergency_phone: $emergency_phone,
                    blood_type: $blood_type,
                    allergies: $allergies,
                    medical_conditions: $medical_conditions,
                    current_medications: $current_medications,
                    insurance_provider: $insurance_provider,
                    insurance_number: $insurance_number,
                    created_at: datetime(),
                    updated_at: datetime()
                })
                RETURN p
                """
                update_query = create_query
                params = {"user_id": current_user["id"], **profile_data.dict()}
            
            result = session.run(update_query, params)
            
            profile_record = result.single()
            if profile_record:
                profile_dict = dict(profile_record["p"])
                # Convert datetime fields
                for field in ['created_at', 'updated_at']:
                    if field in profile_dict and profile_dict[field]:
                        profile_dict[field] = str(profile_dict[field])
                
                return {
                    "success": True,
                    "message": "Profile updated successfully",
                    "profile": profile_dict
                }
            else:
                raise HTTPException(status_code=500, detail="Failed to update profile")
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/doctor/update")
def update_doctor_profile(
    profile_data: DoctorProfileUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update doctor profile"""
    if current_user["role"] != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can update doctor profiles")
    
    try:
        with driver.session() as session:
            # Check if doctor profile exists
            check_result = session.run(
                "MATCH (d:Doctor {user_id: $user_id}) RETURN d",
                user_id=current_user["id"]
            )
            
            if check_result.single():
                # Update existing profile
                set_clauses = ["d.updated_at = datetime()"]
                params = {"user_id": current_user["id"]}
                
                for field, value in profile_data.dict(exclude_unset=True).items():
                    if value is not None:
                        set_clauses.append(f"d.{field} = ${field}")
                        params[field] = value
                
                update_query = f"""
                MATCH (d:Doctor {{user_id: $user_id}})
                SET {', '.join(set_clauses)}
                RETURN d
                """
            else:
                # Create new profile
                create_query = """
                CREATE (d:Doctor {
                    user_id: $user_id,
                    full_name: $full_name,
                    specialization: $specialization,
                    license_number: $license_number,
                    medical_degree: $medical_degree,
                    experience_years: $experience_years,
                    phone: $phone,
                    clinic_address: $clinic_address,
                    consultation_fee: $consultation_fee,
                    available_days: $available_days,
                    available_hours: $available_hours,
                    bio: $bio,
                    certifications: $certifications,
                    languages: $languages,
                    rating: 0.0,
                    total_reviews: 0,
                    created_at: datetime(),
                    updated_at: datetime()
                })
                RETURN d
                """
                update_query = create_query
                params = {"user_id": current_user["id"], **profile_data.dict()}
            
            result = session.run(update_query, params)
            
            profile_record = result.single()
            if profile_record:
                profile_dict = dict(profile_record["d"])
                # Convert datetime fields
                for field in ['created_at', 'updated_at']:
                    if field in profile_dict and profile_dict[field]:
                        profile_dict[field] = str(profile_dict[field])
                
                return {
                    "success": True,
                    "message": "Profile updated successfully",
                    "profile": profile_dict
                }
            else:
                raise HTTPException(status_code=500, detail="Failed to update profile")
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload-avatar")
def upload_avatar(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload profile avatar"""
    try:
        # Validate file type
        allowed_types = ['image/jpeg', 'image/png', 'image/gif']
        if file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="Only JPEG, PNG, and GIF images are allowed")
        
        # Create avatars directory
        avatars_dir = "uploads/avatars"
        if not os.path.exists(avatars_dir):
            os.makedirs(avatars_dir)
        
        # Generate unique filename
        file_extension = file.filename.split('.')[-1]
        avatar_filename = f"{current_user['id']}_avatar.{file_extension}"
        file_path = os.path.join(avatars_dir, avatar_filename)
        
        # Save file
        with open(file_path, "wb") as buffer:
            content = file.file.read()
            buffer.write(content)
        
        # Update user's avatar path in database
        with driver.session() as session:
            if current_user["role"] == "patient":
                query = """
                MERGE (p:Patient {user_id: $user_id})
                SET p.avatar_url = $avatar_url, p.updated_at = datetime()
                RETURN p
                """
            elif current_user["role"] == "doctor":
                query = """
                MERGE (d:Doctor {user_id: $user_id})
                SET d.avatar_url = $avatar_url, d.updated_at = datetime()
                RETURN d
                """
            else:
                raise HTTPException(status_code=403, detail="Invalid user role")
            
            result = session.run(query, 
                user_id=current_user["id"],
                avatar_url=f"/uploads/avatars/{avatar_filename}"
            )
            
            if result.single():
                return {
                    "success": True,
                    "message": "Avatar uploaded successfully",
                    "avatar_url": f"/uploads/avatars/{avatar_filename}"
                }
            else:
                raise HTTPException(status_code=500, detail="Failed to update avatar")
                
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/doctors/search")
def search_doctors(
    specialization: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    min_rating: Optional[float] = Query(None),
    available_today: bool = Query(False),
    limit: int = Query(20, le=100)
):
    """Search for doctors with filters"""
    try:
        with driver.session() as session:
            query = """
            MATCH (d:Doctor)
            OPTIONAL MATCH (u:User {id: d.user_id})
            WHERE u.role = 'doctor'
            """
            
            conditions = []
            params = {"limit": limit}
            
            if specialization:
                conditions.append("toLower(d.specialization) CONTAINS toLower($specialization)")
                params["specialization"] = specialization
            
            if location:
                conditions.append("toLower(d.clinic_address) CONTAINS toLower($location)")
                params["location"] = location
            
            if min_rating:
                conditions.append("d.rating >= $min_rating")
                params["min_rating"] = min_rating
            
            if available_today:
                # Get current day of week
                current_day = datetime.now().strftime('%A').lower()
                conditions.append("$current_day IN [day in d.available_days | toLower(day)]")
                params["current_day"] = current_day
            
            if conditions:
                query += " AND " + " AND ".join(conditions)
            
            query += " RETURN d, u ORDER BY d.rating DESC, d.total_reviews DESC LIMIT $limit"
            
            result = session.run(query, params)
            
            doctors = []
            for record in result:
                doctor = dict(record["d"])
                user = dict(record["u"]) if record["u"] else {}
                
                # Convert datetime fields and remove password
                for item in [doctor, user]:
                    for field in ['created_at', 'updated_at']:
                        if field in item and item[field]:
                            item[field] = str(item[field])
                
                if 'password' in user:
                    del user['password']
                
                doctors.append({
                    "doctor_profile": doctor,
                    "user_info": user
                })
            
            return {"doctors": doctors}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/doctor/{doctor_id}/public")
def get_doctor_public_profile(doctor_id: str):
    """Get doctor's public profile information"""
    try:
        with driver.session() as session:
            result = session.run(
                """
                MATCH (d:Doctor {user_id: $doctor_id})
                OPTIONAL MATCH (u:User {id: $doctor_id})
                OPTIONAL MATCH (d)<-[:REVIEWED]-(r:Review)
                RETURN d, u, 
                       count(r) as review_count,
                       avg(r.rating) as avg_rating
                """,
                doctor_id=doctor_id
            )
            
            record = result.single()
            if record:
                doctor = dict(record["d"])
                user = dict(record["u"]) if record["u"] else {}
                
                # Convert datetime fields and remove sensitive info
                for item in [doctor, user]:
                    for field in ['created_at', 'updated_at']:
                        if field in item and item[field]:
                            item[field] = str(item[field])
                
                # Remove sensitive information
                if 'password' in user:
                    del user['password']
                
                # Remove sensitive doctor info from public view
                sensitive_fields = ['license_number', 'phone']
                for field in sensitive_fields:
                    if field in doctor:
                        del doctor[field]
                
                return {
                    "doctor_profile": doctor,
                    "user_info": user,
                    "stats": {
                        "review_count": record["review_count"] or 0,
                        "avg_rating": float(record["avg_rating"]) if record["avg_rating"] else 0.0
                    }
                }
            else:
                raise HTTPException(status_code=404, detail="Doctor not found")
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
