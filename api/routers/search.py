from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
from pydantic import BaseModel

from auth.utils import get_current_user
from database.connection import driver

router = APIRouter(prefix="/search", tags=["search"])

class SearchFilters(BaseModel):
    query: str
    search_type: str  # doctors, patients, consultations, appointments, prescriptions
    specialization: Optional[str] = None
    location: Optional[str] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    status: Optional[str] = None
    rating_min: Optional[float] = None
    availability: Optional[bool] = None

@router.post("/global")
def global_search(
    search_filters: SearchFilters,
    current_user: dict = Depends(get_current_user),
    limit: int = Query(20, le=100)
):
    """Global search across the platform"""
    try:
        with driver.session() as session:
            search_query = search_filters.query.lower()
            
            if search_filters.search_type == "doctors":
                query = """
                MATCH (d:Doctor)
                OPTIONAL MATCH (u:User {id: d.user_id})
                WHERE toLower(d.full_name) CONTAINS $search_query
                   OR toLower(d.specialization) CONTAINS $search_query
                   OR toLower(u.email) CONTAINS $search_query
                """
                
                conditions = []
                params = {"search_query": search_query, "limit": limit}
                
                if search_filters.specialization:
                    conditions.append("toLower(d.specialization) = toLower($specialization)")
                    params["specialization"] = search_filters.specialization
                
                if search_filters.location:
                    conditions.append("toLower(d.clinic_address) CONTAINS toLower($location)")
                    params["location"] = search_filters.location
                
                if search_filters.rating_min:
                    conditions.append("d.rating >= $rating_min")
                    params["rating_min"] = search_filters.rating_min
                
                if search_filters.availability:
                    # Check if doctor has available slots today
                    today = datetime.now().strftime('%A')
                    conditions.append("$today IN d.available_days")
                    params["today"] = today
                
                if conditions:
                    query += " AND " + " AND ".join(conditions)
                
                query += " RETURN d, u ORDER BY d.rating DESC LIMIT $limit"
                
                result = session.run(query, params)
                
                doctors = []
                for record in result:
                    doctor = dict(record["d"])
                    user = dict(record["u"]) if record["u"] else {}
                    
                    # Convert datetime and remove sensitive info
                    for item in [doctor, user]:
                        for field in ['created_at', 'updated_at']:
                            if field in item and item[field]:
                                item[field] = str(item[field])
                    
                    if 'password' in user:
                        del user['password']
                    
                    doctors.append({
                        "type": "doctor",
                        "doctor": doctor,
                        "user": user
                    })
                
                return {"results": doctors, "total": len(doctors)}
            
            elif search_filters.search_type == "consultations":
                # Only allow doctors and admins to search consultations
                if current_user["role"] not in ["doctor", "admin"]:
                    raise HTTPException(status_code=403, detail="Access denied")
                
                query = """
                MATCH (c:Consultation)
                OPTIONAL MATCH (p:Patient {user_id: c.patient_id})
                OPTIONAL MATCH (pu:User {id: c.patient_id})
                WHERE toLower(c.question) CONTAINS $search_query
                   OR toLower(c.symptoms) CONTAINS $search_query
                   OR toLower(c.diagnosis) CONTAINS $search_query
                """
                
                conditions = []
                params = {"search_query": search_query, "limit": limit}
                
                if search_filters.status:
                    conditions.append("c.status = $status")
                    params["status"] = search_filters.status
                
                if search_filters.date_from:
                    conditions.append("date(c.created_at) >= date($date_from)")
                    params["date_from"] = search_filters.date_from
                
                if search_filters.date_to:
                    conditions.append("date(c.created_at) <= date($date_to)")
                    params["date_to"] = search_filters.date_to
                
                if conditions:
                    query += " AND " + " AND ".join(conditions)
                
                query += " RETURN c, p, pu ORDER BY c.created_at DESC LIMIT $limit"
                
                result = session.run(query, params)
                
                consultations = []
                for record in result:
                    consultation = dict(record["c"])
                    patient = dict(record["p"]) if record["p"] else {}
                    patient_user = dict(record["pu"]) if record["pu"] else {}
                    
                    # Convert datetime fields
                    for field in ['created_at', 'updated_at', 'answered_at']:
                        if field in consultation and consultation[field]:
                            consultation[field] = str(consultation[field])
                    
                    # Anonymize patient data for doctors
                    if current_user["role"] == "doctor":
                        if patient_user:
                            patient_user["email"] = "***@***.com"
                        if patient:
                            patient["full_name"] = patient.get("full_name", "")[:1] + "***"
                    
                    if 'password' in patient_user:
                        del patient_user['password']
                    
                    consultations.append({
                        "type": "consultation",
                        "consultation": consultation,
                        "patient": patient,
                        "patient_user": patient_user
                    })
                
                return {"results": consultations, "total": len(consultations)}
            
            else:
                raise HTTPException(status_code=400, detail="Invalid search type")
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/doctors/advanced")
def advanced_doctor_search(
    current_user: dict = Depends(get_current_user),
    name: Optional[str] = Query(None),
    specialization: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    min_rating: Optional[float] = Query(None),
    max_fee: Optional[float] = Query(None),
    available_today: bool = Query(False),
    languages: Optional[str] = Query(None),
    experience_years_min: Optional[int] = Query(None),
    sort_by: str = Query("rating"),  # rating, experience, fee, reviews
    limit: int = Query(20, le=100)
):
    """Advanced doctor search with multiple filters"""
    try:
        with driver.session() as session:
            query = """
            MATCH (d:Doctor)
            OPTIONAL MATCH (u:User {id: d.user_id})
            WHERE u.role = 'doctor' AND (u.status IS NULL OR u.status = 'active')
            """
            
            conditions = []
            params = {"limit": limit}
            
            if name:
                conditions.append("toLower(d.full_name) CONTAINS toLower($name)")
                params["name"] = name
            
            if specialization:
                conditions.append("toLower(d.specialization) CONTAINS toLower($specialization)")
                params["specialization"] = specialization
            
            if location:
                conditions.append("toLower(d.clinic_address) CONTAINS toLower($location)")
                params["location"] = location
            
            if min_rating:
                conditions.append("d.rating >= $min_rating")
                params["min_rating"] = min_rating
            
            if max_fee:
                conditions.append("d.consultation_fee <= $max_fee")
                params["max_fee"] = max_fee
            
            if experience_years_min:
                conditions.append("d.experience_years >= $experience_years_min")
                params["experience_years_min"] = experience_years_min
            
            if languages:
                conditions.append("$languages IN d.languages")
                params["languages"] = languages
            
            if available_today:
                today = datetime.now().strftime('%A')
                conditions.append("$today IN d.available_days")
                params["today"] = today
            
            if conditions:
                query += " AND " + " AND ".join(conditions)
            
            # Add sorting
            if sort_by == "rating":
                query += " RETURN d, u ORDER BY d.rating DESC, d.total_reviews DESC"
            elif sort_by == "experience":
                query += " RETURN d, u ORDER BY d.experience_years DESC"
            elif sort_by == "fee":
                query += " RETURN d, u ORDER BY d.consultation_fee ASC"
            elif sort_by == "reviews":
                query += " RETURN d, u ORDER BY d.total_reviews DESC"
            else:
                query += " RETURN d, u ORDER BY d.rating DESC"
            
            query += " LIMIT $limit"
            
            result = session.run(query, params)
            
            doctors = []
            for record in result:
                doctor = dict(record["d"])
                user = dict(record["u"]) if record["u"] else {}
                
                # Convert datetime and remove sensitive info
                for item in [doctor, user]:
                    for field in ['created_at', 'updated_at']:
                        if field in item and item[field]:
                            item[field] = str(item[field])
                
                if 'password' in user:
                    del user['password']
                
                # Calculate additional metrics
                with driver.session() as metrics_session:
                    metrics_result = metrics_session.run(
                        """
                        MATCH (d:Doctor {user_id: $doctor_id})
                        OPTIONAL MATCH (d)-[:RESPONDED_TO]->(c:Consultation)
                        OPTIONAL MATCH (d)<-[:REVIEWED]-(r:Review)
                        RETURN 
                            count(DISTINCT c) as consultation_count,
                            count(DISTINCT r) as review_count,
                            avg(r.rating) as avg_rating,
                            count(CASE WHEN c.created_at >= datetime() - duration('P30D') THEN 1 END) as recent_consultations
                        """,
                        doctor_id=doctor.get("user_id")
                    )
                    
                    metrics = metrics_result.single()
                    
                    doctor["metrics"] = {
                        "consultation_count": metrics["consultation_count"] if metrics else 0,
                        "review_count": metrics["review_count"] if metrics else 0,
                        "avg_rating": round(float(metrics["avg_rating"]), 2) if metrics and metrics["avg_rating"] else 0.0,
                        "recent_consultations": metrics["recent_consultations"] if metrics else 0
                    }
                
                doctors.append({
                    "doctor": doctor,
                    "user": user
                })
            
            return {"results": doctors, "total": len(doctors)}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analytics/trends")
def get_platform_trends(
    current_user: dict = Depends(get_current_user),
    days: int = Query(30, le=365)
):
    """Get platform usage trends"""
    try:
        with driver.session() as session:
            start_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
            
            trends_query = """
            // Daily user registrations
            MATCH (u:User)
            WHERE date(u.created_at) >= date($start_date)
            WITH date(u.created_at) as reg_date, count(u) as daily_users
            
            // Daily consultations
            OPTIONAL MATCH (c:Consultation)
            WHERE date(c.created_at) >= date($start_date)
            WITH reg_date, daily_users, date(c.created_at) as consult_date, count(c) as daily_consultations
            
            // Daily appointments
            OPTIONAL MATCH (a:Appointment)
            WHERE date(a.created_at) >= date($start_date)
            WITH reg_date, daily_users, consult_date, daily_consultations, 
                 date(a.created_at) as appt_date, count(a) as daily_appointments
            
            RETURN reg_date, daily_users, consult_date, daily_consultations, 
                   appt_date, daily_appointments
            ORDER BY reg_date DESC
            """
            
            result = session.run(trends_query, start_date=start_date)
            
            trends_data = []
            for record in result:
                trends_data.append({
                    "date": str(record["reg_date"]) if record["reg_date"] else None,
                    "new_users": record["daily_users"] or 0,
                    "consultations": record["daily_consultations"] or 0,
                    "appointments": record["daily_appointments"] or 0
                })
            
            return {"trends": trends_data, "period_days": days}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/suggestions/doctors")
def get_doctor_suggestions(
    current_user: dict = Depends(get_current_user),
    symptoms: Optional[str] = Query(None),
    previous_consultations: bool = Query(True)
):
    """Get doctor suggestions based on patient history and symptoms"""
    if current_user["role"] != "patient":
        raise HTTPException(status_code=403, detail="Only patients can get doctor suggestions")
    
    try:
        with driver.session() as session:
            if previous_consultations:
                # Get doctors the patient has consulted with before
                history_query = """
                MATCH (c:Consultation {patient_id: $patient_id})
                MATCH (d:Doctor)-[:RESPONDED_TO]->(c)
                OPTIONAL MATCH (u:User {id: d.user_id})
                WHERE c.status IN ['answered', 'closed']
                RETURN d, u, count(c) as consultation_count, avg(5.0) as assumed_rating
                ORDER BY consultation_count DESC
                LIMIT 3
                """
                
                history_result = session.run(history_query, patient_id=current_user["id"])
                previous_doctors = []
                
                for record in history_result:
                    doctor = dict(record["d"])
                    user = dict(record["u"]) if record["u"] else {}
                    
                    # Convert datetime and remove sensitive info
                    for item in [doctor, user]:
                        for field in ['created_at', 'updated_at']:
                            if field in item and item[field]:
                                item[field] = str(item[field])
                    
                    if 'password' in user:
                        del user['password']
                    
                    previous_doctors.append({
                        "doctor": doctor,
                        "user": user,
                        "relationship": "previous_consultation",
                        "consultation_count": record["consultation_count"]
                    })
            
            # Get top-rated doctors in relevant specializations
            if symptoms:
                # Simple symptom to specialization mapping
                specialization_map = {
                    "heart": "Cardiology",
                    "skin": "Dermatology", 
                    "stomach": "Gastroenterology",
                    "brain": "Neurology",
                    "bone": "Orthopedics",
                    "eye": "Ophthalmology",
                    "mental": "Psychiatry"
                }
                
                suggested_specialization = None
                for symptom, spec in specialization_map.items():
                    if symptom in symptoms.lower():
                        suggested_specialization = spec
                        break
                
                if suggested_specialization:
                    specialty_query = """
                    MATCH (d:Doctor {specialization: $specialization})
                    OPTIONAL MATCH (u:User {id: d.user_id})
                    WHERE u.role = 'doctor' AND (u.status IS NULL OR u.status = 'active')
                    RETURN d, u
                    ORDER BY d.rating DESC, d.total_reviews DESC
                    LIMIT 5
                    """
                    
                    specialty_result = session.run(specialty_query, specialization=suggested_specialization)
                    
                    specialty_doctors = []
                    for record in specialty_result:
                        doctor = dict(record["d"])
                        user = dict(record["u"]) if record["u"] else {}
                        
                        # Convert datetime and remove sensitive info
                        for item in [doctor, user]:
                            for field in ['created_at', 'updated_at']:
                                if field in item and item[field]:
                                    item[field] = str(item[field])
                        
                        if 'password' in user:
                            del user['password']
                        
                        specialty_doctors.append({
                            "doctor": doctor,
                            "user": user,
                            "relationship": "specialization_match",
                            "specialization": suggested_specialization
                        })
                    
                    suggestions = {
                        "previous_doctors": previous_doctors if previous_consultations else [],
                        "specialty_doctors": specialty_doctors,
                        "suggested_specialization": suggested_specialization
                    }
                else:
                    # General practitioners
                    general_query = """
                    MATCH (d:Doctor)
                    OPTIONAL MATCH (u:User {id: d.user_id})
                    WHERE (d.specialization = 'General Medicine' OR d.specialization = 'Family Medicine')
                      AND u.role = 'doctor' 
                      AND (u.status IS NULL OR u.status = 'active')
                    RETURN d, u
                    ORDER BY d.rating DESC
                    LIMIT 5
                    """
                    
                    general_result = session.run(general_query)
                    
                    general_doctors = []
                    for record in general_result:
                        doctor = dict(record["d"])
                        user = dict(record["u"]) if record["u"] else {}
                        
                        # Convert datetime and remove sensitive info
                        for item in [doctor, user]:
                            for field in ['created_at', 'updated_at']:
                                if field in item and item[field]:
                                    item[field] = str(item[field])
                        
                        if 'password' in user:
                            del user['password']
                        
                        general_doctors.append({
                            "doctor": doctor,
                            "user": user,
                            "relationship": "general_practitioner"
                        })
                    
                    suggestions = {
                        "previous_doctors": previous_doctors if previous_consultations else [],
                        "general_doctors": general_doctors,
                        "suggested_specialization": "General Medicine"
                    }
            else:
                # No symptoms provided, just return previous doctors and top-rated
                top_rated_query = """
                MATCH (d:Doctor)
                OPTIONAL MATCH (u:User {id: d.user_id})
                WHERE u.role = 'doctor' AND (u.status IS NULL OR u.status = 'active')
                RETURN d, u
                ORDER BY d.rating DESC, d.total_reviews DESC
                LIMIT 5
                """
                
                top_rated_result = session.run(top_rated_query)
                
                top_rated_doctors = []
                for record in top_rated_result:
                    doctor = dict(record["d"])
                    user = dict(record["u"]) if record["u"] else {}
                    
                    # Convert datetime and remove sensitive info
                    for item in [doctor, user]:
                        for field in ['created_at', 'updated_at']:
                            if field in item and item[field]:
                                item[field] = str(item[field])
                    
                    if 'password' in user:
                        del user['password']
                    
                    top_rated_doctors.append({
                        "doctor": doctor,
                        "user": user,
                        "relationship": "top_rated"
                    })
                
                suggestions = {
                    "previous_doctors": previous_doctors if previous_consultations else [],
                    "top_rated_doctors": top_rated_doctors
                }
            
            return {"suggestions": suggestions}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/autocomplete/{search_type}")
def search_autocomplete(
    search_type: str,  # doctors, specializations, symptoms, medications
    query: str = Query(..., min_length=2),
    limit: int = Query(10, le=20)
):
    """Autocomplete suggestions for search"""
    try:
        with driver.session() as session:
            if search_type == "doctors":
                result = session.run(
                    """
                    MATCH (d:Doctor)
                    OPTIONAL MATCH (u:User {id: d.user_id})
                    WHERE toLower(d.full_name) CONTAINS toLower($query)
                      AND u.role = 'doctor'
                    RETURN d.full_name as suggestion, d.specialization as category
                    ORDER BY d.rating DESC
                    LIMIT $limit
                    """,
                    query=query,
                    limit=limit
                )
            elif search_type == "specializations":
                result = session.run(
                    """
                    MATCH (d:Doctor)
                    WHERE toLower(d.specialization) CONTAINS toLower($query)
                    RETURN DISTINCT d.specialization as suggestion, 'specialization' as category
                    ORDER BY d.specialization
                    LIMIT $limit
                    """,
                    query=query,
                    limit=limit
                )
            elif search_type == "symptoms":
                # Predefined symptoms list (in a real app, this could be from a medical database)
                common_symptoms = [
                    "Headache", "Fever", "Cough", "Chest Pain", "Abdominal Pain",
                    "Back Pain", "Nausea", "Dizziness", "Fatigue", "Shortness of Breath",
                    "Skin Rash", "Joint Pain", "Muscle Pain", "Sore Throat", "Runny Nose"
                ]
                
                filtered_symptoms = [s for s in common_symptoms if query.lower() in s.lower()][:limit]
                
                suggestions = []
                for symptom in filtered_symptoms:
                    suggestions.append({
                        "suggestion": symptom,
                        "category": "symptom"
                    })
                
                return {"suggestions": suggestions}
            
            elif search_type == "medications":
                # Common medications (in a real app, this would be from a drug database)
                common_medications = [
                    "Ibuprofen", "Acetaminophen", "Aspirin", "Amoxicillin", "Lisinopril",
                    "Metformin", "Atorvastatin", "Omeprazole", "Losartan", "Levothyroxine"
                ]
                
                filtered_meds = [m for m in common_medications if query.lower() in m.lower()][:limit]
                
                suggestions = []
                for med in filtered_meds:
                    suggestions.append({
                        "suggestion": med,
                        "category": "medication"
                    })
                
                return {"suggestions": suggestions}
            
            else:
                raise HTTPException(status_code=400, detail="Invalid search type")
            
            suggestions = []
            for record in result:
                suggestions.append({
                    "suggestion": record["suggestion"],
                    "category": record["category"]
                })
            
            return {"suggestions": suggestions}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/emergency/nearby-doctors")
def find_emergency_doctors(
    current_user: dict = Depends(get_current_user),
    location: Optional[str] = Query(None),
    radius_km: int = Query(10, le=50)
):
    """Find doctors available for emergency consultations"""
    try:
        with driver.session() as session:
            # Find doctors who handle emergencies and are available
            current_time = datetime.now()
            current_day = current_time.strftime('%A')
            current_hour = current_time.hour
            
            query = """
            MATCH (d:Doctor)
            OPTIONAL MATCH (u:User {id: d.user_id})
            WHERE u.role = 'doctor' 
              AND (u.status IS NULL OR u.status = 'active')
              AND ($current_day IN d.available_days OR 'Emergency' IN d.available_days)
              AND (d.specialization IN ['General Medicine', 'Emergency Medicine', 'Family Medicine'] OR d.emergency_available = true)
            """
            
            params = {
                "current_day": current_day,
                "current_hour": current_hour,
                "limit": 10
            }
            
            if location:
                query += " AND toLower(d.clinic_address) CONTAINS toLower($location)"
                params["location"] = location
            
            query += """
            RETURN d, u, 
                   CASE WHEN d.emergency_available = true THEN 1 ELSE 0 END as emergency_priority
            ORDER BY emergency_priority DESC, d.rating DESC
            LIMIT 10
            """
            
            result = session.run(query, params)
            
            emergency_doctors = []
            for record in result:
                doctor = dict(record["d"])
                user = dict(record["u"]) if record["u"] else {}
                
                # Convert datetime and remove sensitive info
                for item in [doctor, user]:
                    for field in ['created_at', 'updated_at']:
                        if field in item and item[field]:
                            item[field] = str(item[field])
                
                if 'password' in user:
                    del user['password']
                
                emergency_doctors.append({
                    "doctor": doctor,
                    "user": user,
                    "availability": "emergency_available" if record["emergency_priority"] else "general_hours",
                    "estimated_response_time": "5-15 minutes" if record["emergency_priority"] else "30-60 minutes"
                })
            
            return {
                "emergency_doctors": emergency_doctors,
                "search_location": location,
                "search_time": current_time.isoformat()
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
