from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
from pydantic import BaseModel

from auth.utils import get_current_user
from database.connection import driver

router = APIRouter(prefix="/medical-history", tags=["medical-history"])

class VitalSigns(BaseModel):
    blood_pressure_systolic: Optional[int] = None
    blood_pressure_diastolic: Optional[int] = None
    heart_rate: Optional[int] = None
    temperature: Optional[float] = None
    weight: Optional[float] = None
    height: Optional[float] = None
    oxygen_saturation: Optional[int] = None

class LabResult(BaseModel):
    test_name: str
    result_value: str
    reference_range: Optional[str] = None
    unit: Optional[str] = None
    status: str = "normal"  # normal, abnormal, critical

class MedicalHistoryEntry(BaseModel):
    patient_id: str
    entry_type: str  # diagnosis, treatment, surgery, allergy, medication, lab_result, vital_signs
    title: str
    description: str
    date_recorded: str
    doctor_id: Optional[str] = None
    severity: str = "medium"  # low, medium, high
    vital_signs: Optional[VitalSigns] = None
    lab_results: Optional[List[LabResult]] = None
    medications: Optional[List[str]] = None
    follow_up_required: bool = False

class HealthMetrics(BaseModel):
    patient_id: str
    date_recorded: str
    weight: Optional[float] = None
    height: Optional[float] = None
    bmi: Optional[float] = None
    blood_pressure: Optional[str] = None
    heart_rate: Optional[int] = None
    blood_sugar: Optional[float] = None
    cholesterol: Optional[float] = None
    notes: Optional[str] = None

@router.post("/add-entry")
def add_medical_history_entry(
    entry_data: MedicalHistoryEntry,
    current_user: dict = Depends(get_current_user)
):
    """Add a medical history entry"""
    # Patients can add to their own history, doctors can add to any patient's history
    if current_user["role"] == "patient" and entry_data.patient_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="Patients can only add to their own medical history")
    
    try:
        with driver.session() as session:
            entry_id = str(uuid.uuid4())
            
            # Calculate BMI if height and weight are in vital signs
            bmi = None
            if entry_data.vital_signs and entry_data.vital_signs.height and entry_data.vital_signs.weight:
                height_m = entry_data.vital_signs.height / 100  # Convert cm to m
                bmi = entry_data.vital_signs.weight / (height_m ** 2)
            
            result = session.run(
                """
                CREATE (h:MedicalHistory {
                    id: $entry_id,
                    patient_id: $patient_id,
                    doctor_id: $doctor_id,
                    entry_type: $entry_type,
                    title: $title,
                    description: $description,
                    date_recorded: $date_recorded,
                    severity: $severity,
                    vital_signs: $vital_signs,
                    lab_results: $lab_results,
                    medications: $medications,
                    follow_up_required: $follow_up_required,
                    bmi: $bmi,
                    created_by: $created_by,
                    created_at: datetime(),
                    updated_at: datetime()
                })
                RETURN h
                """,
                entry_id=entry_id,
                patient_id=entry_data.patient_id,
                doctor_id=entry_data.doctor_id,
                entry_type=entry_data.entry_type,
                title=entry_data.title,
                description=entry_data.description,
                date_recorded=entry_data.date_recorded,
                severity=entry_data.severity,
                vital_signs=entry_data.vital_signs.dict() if entry_data.vital_signs else None,
                lab_results=[lab.dict() for lab in entry_data.lab_results] if entry_data.lab_results else None,
                medications=entry_data.medications,
                follow_up_required=entry_data.follow_up_required,
                bmi=bmi,
                created_by=current_user["id"]
            )
            
            history_record = result.single()
            if history_record:
                history_dict = dict(history_record["h"])
                # Convert datetime fields
                for field in ['created_at', 'updated_at']:
                    if field in history_dict and history_dict[field]:
                        history_dict[field] = str(history_dict[field])
                
                return {
                    "success": True,
                    "message": "Medical history entry added successfully",
                    "entry": history_dict
                }
            else:
                raise HTTPException(status_code=500, detail="Failed to create medical history entry")
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/patient/{patient_id}")
def get_patient_medical_history(
    patient_id: str,
    current_user: dict = Depends(get_current_user),
    entry_type: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    limit: int = Query(50, le=200)
):
    """Get medical history for a patient"""
    # Patients can only access their own history, doctors can access any patient's history
    if current_user["role"] == "patient" and patient_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        with driver.session() as session:
            query = """
            MATCH (h:MedicalHistory {patient_id: $patient_id})
            OPTIONAL MATCH (d:Doctor {user_id: h.doctor_id})
            OPTIONAL MATCH (du:User {id: h.doctor_id})
            """
            
            conditions = []
            params = {"patient_id": patient_id, "limit": limit}
            
            if entry_type:
                conditions.append("h.entry_type = $entry_type")
                params["entry_type"] = entry_type
            
            if from_date:
                conditions.append("h.date_recorded >= $from_date")
                params["from_date"] = from_date
            
            if to_date:
                conditions.append("h.date_recorded <= $to_date")
                params["to_date"] = to_date
            
            if conditions:
                query += " WHERE " + " AND ".join(conditions)
            
            query += " RETURN h, d, du ORDER BY h.date_recorded DESC, h.created_at DESC LIMIT $limit"
            
            result = session.run(query, params)
            
            history_entries = []
            for record in result:
                history = dict(record["h"])
                doctor = dict(record["d"]) if record["d"] else None
                doctor_user = dict(record["du"]) if record["du"] else None
                
                # Convert datetime fields
                for field in ['created_at', 'updated_at']:
                    if field in history and history[field]:
                        history[field] = str(history[field])
                
                if doctor_user and 'password' in doctor_user:
                    del doctor_user['password']
                
                history_entries.append({
                    "entry": history,
                    "doctor": doctor,
                    "doctor_user": doctor_user
                })
            
            return {"history": history_entries}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/health-metrics")
def add_health_metrics(
    metrics_data: HealthMetrics,
    current_user: dict = Depends(get_current_user)
):
    """Add health metrics (weight, blood pressure, etc.)"""
    if current_user["role"] == "patient" and metrics_data.patient_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="Patients can only add their own health metrics")
    
    try:
        with driver.session() as session:
            metrics_id = str(uuid.uuid4())
            
            # Calculate BMI if height and weight provided
            bmi = None
            if metrics_data.height and metrics_data.weight:
                height_m = metrics_data.height / 100  # Convert cm to m
                bmi = metrics_data.weight / (height_m ** 2)
            
            result = session.run(
                """
                CREATE (m:HealthMetrics {
                    id: $metrics_id,
                    patient_id: $patient_id,
                    date_recorded: $date_recorded,
                    weight: $weight,
                    height: $height,
                    bmi: $bmi,
                    blood_pressure: $blood_pressure,
                    heart_rate: $heart_rate,
                    blood_sugar: $blood_sugar,
                    cholesterol: $cholesterol,
                    notes: $notes,
                    recorded_by: $recorded_by,
                    created_at: datetime()
                })
                RETURN m
                """,
                metrics_id=metrics_id,
                patient_id=metrics_data.patient_id,
                date_recorded=metrics_data.date_recorded,
                weight=metrics_data.weight,
                height=metrics_data.height,
                bmi=bmi,
                blood_pressure=metrics_data.blood_pressure,
                heart_rate=metrics_data.heart_rate,
                blood_sugar=metrics_data.blood_sugar,
                cholesterol=metrics_data.cholesterol,
                notes=metrics_data.notes,
                recorded_by=current_user["id"]
            )
            
            metrics_record = result.single()
            if metrics_record:
                metrics_dict = dict(metrics_record["m"])
                metrics_dict['created_at'] = str(metrics_dict['created_at'])
                
                return {
                    "success": True,
                    "message": "Health metrics added successfully",
                    "metrics": metrics_dict
                }
            else:
                raise HTTPException(status_code=500, detail="Failed to add health metrics")
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health-metrics/{patient_id}")
def get_health_metrics(
    patient_id: str,
    current_user: dict = Depends(get_current_user),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    limit: int = Query(100, le=500)
):
    """Get health metrics for a patient"""
    if current_user["role"] == "patient" and patient_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        with driver.session() as session:
            query = """
            MATCH (m:HealthMetrics {patient_id: $patient_id})
            """
            
            conditions = []
            params = {"patient_id": patient_id, "limit": limit}
            
            if from_date:
                conditions.append("m.date_recorded >= $from_date")
                params["from_date"] = from_date
            
            if to_date:
                conditions.append("m.date_recorded <= $to_date")
                params["to_date"] = to_date
            
            if conditions:
                query += " WHERE " + " AND ".join(conditions)
            
            query += " RETURN m ORDER BY m.date_recorded DESC LIMIT $limit"
            
            result = session.run(query, params)
            
            metrics = []
            for record in result:
                metric = dict(record["m"])
                metric['created_at'] = str(metric['created_at'])
                metrics.append(metric)
            
            return {"metrics": metrics}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/summary/{patient_id}")
def get_patient_health_summary(
    patient_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get comprehensive health summary for a patient"""
    if current_user["role"] == "patient" and patient_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        with driver.session() as session:
            # Get patient basic info
            patient_result = session.run(
                """
                MATCH (p:Patient {user_id: $patient_id})
                OPTIONAL MATCH (u:User {id: $patient_id})
                RETURN p, u
                """,
                patient_id=patient_id
            )
            
            patient_record = patient_result.single()
            if not patient_record:
                raise HTTPException(status_code=404, detail="Patient not found")
            
            patient = dict(patient_record["p"]) if patient_record["p"] else {}
            user = dict(patient_record["u"]) if patient_record["u"] else {}
            
            # Get recent consultations count
            consultations_result = session.run(
                """
                MATCH (c:Consultation {patient_id: $patient_id})
                RETURN count(c) as total_consultations,
                       count(CASE WHEN c.status = 'pending' THEN 1 END) as pending_consultations
                """,
                patient_id=patient_id
            )
            
            # Get recent appointments count
            appointments_result = session.run(
                """
                MATCH (a:Appointment {patient_id: $patient_id})
                RETURN count(a) as total_appointments,
                       count(CASE WHEN a.status = 'completed' THEN 1 END) as completed_appointments
                """,
                patient_id=patient_id
            )
            
            # Get active prescriptions
            prescriptions_result = session.run(
                """
                MATCH (p:Prescription {patient_id: $patient_id, status: 'active'})
                RETURN count(p) as active_prescriptions
                """,
                patient_id=patient_id
            )
            
            # Get recent health metrics
            metrics_result = session.run(
                """
                MATCH (m:HealthMetrics {patient_id: $patient_id})
                RETURN m ORDER BY m.date_recorded DESC LIMIT 5
                """,
                patient_id=patient_id
            )
            
            # Get medical history summary
            history_result = session.run(
                """
                MATCH (h:MedicalHistory {patient_id: $patient_id})
                RETURN h.entry_type as type, count(h) as count
                ORDER BY count DESC
                """,
                patient_id=patient_id
            )
            
            # Process results
            consultation_stats = consultations_result.single()
            appointment_stats = appointments_result.single()
            prescription_stats = prescriptions_result.single()
            
            recent_metrics = []
            for record in metrics_result:
                metric = dict(record["m"])
                metric['created_at'] = str(metric['created_at'])
                recent_metrics.append(metric)
            
            history_summary = {}
            for record in history_result:
                history_summary[record["type"]] = record["count"]
            
            # Remove sensitive information
            if 'password' in user:
                del user['password']
            
            # Convert datetime fields
            for item in [patient, user]:
                for field in ['created_at', 'updated_at']:
                    if field in item and item[field]:
                        item[field] = str(item[field])
            
            return {
                "patient_info": patient,
                "user_info": user,
                "health_summary": {
                    "consultations": {
                        "total": consultation_stats["total_consultations"] if consultation_stats else 0,
                        "pending": consultation_stats["pending_consultations"] if consultation_stats else 0
                    },
                    "appointments": {
                        "total": appointment_stats["total_appointments"] if appointment_stats else 0,
                        "completed": appointment_stats["completed_appointments"] if appointment_stats else 0
                    },
                    "prescriptions": {
                        "active": prescription_stats["active_prescriptions"] if prescription_stats else 0
                    },
                    "recent_metrics": recent_metrics,
                    "history_summary": history_summary
                }
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/health-metrics")
def add_health_metrics(
    metrics_data: HealthMetrics,
    current_user: dict = Depends(get_current_user)
):
    """Add health metrics for a patient"""
    if current_user["role"] == "patient" and metrics_data.patient_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        with driver.session() as session:
            metrics_id = str(uuid.uuid4())
            
            # Calculate BMI if provided
            bmi = metrics_data.bmi
            if not bmi and metrics_data.height and metrics_data.weight:
                height_m = metrics_data.height / 100
                bmi = metrics_data.weight / (height_m ** 2)
            
            result = session.run(
                """
                CREATE (m:HealthMetrics {
                    id: $metrics_id,
                    patient_id: $patient_id,
                    date_recorded: $date_recorded,
                    weight: $weight,
                    height: $height,
                    bmi: $bmi,
                    blood_pressure: $blood_pressure,
                    heart_rate: $heart_rate,
                    blood_sugar: $blood_sugar,
                    cholesterol: $cholesterol,
                    notes: $notes,
                    recorded_by: $recorded_by,
                    created_at: datetime()
                })
                RETURN m
                """,
                metrics_id=metrics_id,
                patient_id=metrics_data.patient_id,
                date_recorded=metrics_data.date_recorded,
                weight=metrics_data.weight,
                height=metrics_data.height,
                bmi=bmi,
                blood_pressure=metrics_data.blood_pressure,
                heart_rate=metrics_data.heart_rate,
                blood_sugar=metrics_data.blood_sugar,
                cholesterol=metrics_data.cholesterol,
                notes=metrics_data.notes,
                recorded_by=current_user["id"]
            )
            
            metrics_record = result.single()
            if metrics_record:
                metrics_dict = dict(metrics_record["m"])
                metrics_dict['created_at'] = str(metrics_dict['created_at'])
                
                return {
                    "success": True,
                    "message": "Health metrics added successfully",
                    "metrics": metrics_dict
                }
            else:
                raise HTTPException(status_code=500, detail="Failed to add health metrics")
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/allergies/{patient_id}")
def get_patient_allergies(
    patient_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get patient's allergies and medical conditions"""
    if current_user["role"] == "patient" and patient_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        with driver.session() as session:
            # Get from patient profile
            profile_result = session.run(
                """
                MATCH (p:Patient {user_id: $patient_id})
                RETURN p.allergies as allergies, p.medical_conditions as conditions
                """,
                patient_id=patient_id
            )
            
            # Get from medical history
            history_result = session.run(
                """
                MATCH (h:MedicalHistory {patient_id: $patient_id, entry_type: 'allergy'})
                RETURN h.title as allergy, h.severity as severity, h.description as description
                ORDER BY h.created_at DESC
                """,
                patient_id=patient_id
            )
            
            profile_record = profile_result.single()
            profile_allergies = profile_record["allergies"] if profile_record else []
            profile_conditions = profile_record["conditions"] if profile_record else []
            
            history_allergies = []
            for record in history_result:
                history_allergies.append({
                    "allergy": record["allergy"],
                    "severity": record["severity"],
                    "description": record["description"]
                })
            
            return {
                "profile_allergies": profile_allergies or [],
                "profile_conditions": profile_conditions or [],
                "detailed_allergies": history_allergies
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/timeline/{patient_id}")
def get_patient_timeline(
    patient_id: str,
    current_user: dict = Depends(get_current_user),
    limit: int = Query(100, le=500)
):
    """Get comprehensive patient timeline"""
    if current_user["role"] == "patient" and patient_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        with driver.session() as session:
            # Get all patient events (consultations, appointments, prescriptions, history)
            timeline_query = """
            MATCH (p:Patient {user_id: $patient_id})
            
            OPTIONAL MATCH (p)-[:HAS_CONSULTATION]->(c:Consultation)
            OPTIONAL MATCH (c)<-[:RESPONDED_TO]-(cd:Doctor)
            
            OPTIONAL MATCH (a:Appointment {patient_id: $patient_id})
            OPTIONAL MATCH (ad:Doctor {user_id: a.doctor_id})
            
            OPTIONAL MATCH (pr:Prescription {patient_id: $patient_id})
            OPTIONAL MATCH (prd:Doctor {user_id: pr.doctor_id})
            
            OPTIONAL MATCH (h:MedicalHistory {patient_id: $patient_id})
            OPTIONAL MATCH (hd:Doctor {user_id: h.doctor_id})
            
            WITH collect({
                type: 'consultation',
                date: c.created_at,
                data: c,
                doctor: cd,
                title: 'Medical Consultation',
                description: c.question
            }) +
            collect({
                type: 'appointment', 
                date: a.created_at,
                data: a,
                doctor: ad,
                title: 'Appointment',
                description: a.reason
            }) +
            collect({
                type: 'prescription',
                date: pr.created_at, 
                data: pr,
                doctor: prd,
                title: 'Prescription',
                description: 'Medication prescribed'
            }) +
            collect({
                type: 'medical_history',
                date: h.created_at,
                data: h, 
                doctor: hd,
                title: h.title,
                description: h.description
            }) as timeline_events
            
            UNWIND timeline_events as event
            WHERE event.date IS NOT NULL
            RETURN event
            ORDER BY event.date DESC
            LIMIT $limit
            """
            
            result = session.run(timeline_query, patient_id=patient_id, limit=limit)
            
            timeline = []
            for record in result:
                event = dict(record["event"])
                
                # Convert datetime fields
                if event["date"]:
                    event["date"] = str(event["date"])
                
                # Process data based on type
                if event["data"]:
                    data = dict(event["data"])
                    for field in ['created_at', 'updated_at', 'answered_at', 'completed_at']:
                        if field in data and data[field]:
                            data[field] = str(data[field])
                    event["data"] = data
                
                if event["doctor"]:
                    doctor = dict(event["doctor"])
                    for field in ['created_at', 'updated_at']:
                        if field in doctor and doctor[field]:
                            doctor[field] = str(doctor[field])
                    event["doctor"] = doctor
                
                timeline.append(event)
            
            return {"timeline": timeline}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
