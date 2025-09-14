from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
from pydantic import BaseModel

from auth.utils import get_current_user
from database.connection import driver

router = APIRouter(prefix="/appointments", tags=["appointments"])

class AppointmentCreate(BaseModel):
    doctor_id: str
    appointment_date: str  # YYYY-MM-DD
    appointment_time: str  # HH:MM
    appointment_type: str  # consultation, checkup, follow_up, emergency
    reason: str
    duration_minutes: int = 30
    is_urgent: bool = False

class AppointmentUpdate(BaseModel):
    status: Optional[str] = None  # scheduled, confirmed, in_progress, completed, cancelled, no_show
    notes: Optional[str] = None
    actual_duration: Optional[int] = None
    follow_up_required: Optional[bool] = None
    follow_up_date: Optional[str] = None

class AvailabilitySlot(BaseModel):
    date: str
    time: str
    duration_minutes: int = 30
    is_available: bool = True

class DoctorAvailability(BaseModel):
    doctor_id: str
    date: str
    slots: List[AvailabilitySlot]

@router.post("/book")
def book_appointment(
    appointment_data: AppointmentCreate,
    current_user: dict = Depends(get_current_user)
):
    """Book an appointment with a doctor"""
    if current_user["role"] != "patient":
        raise HTTPException(status_code=403, detail="Only patients can book appointments")
    
    try:
        with driver.session() as session:
            # Check if doctor exists and is available
            doctor_check = session.run(
                """
                MATCH (d:Doctor {user_id: $doctor_id})
                MATCH (u:User {id: $doctor_id, role: 'doctor'})
                RETURN d, u
                """,
                doctor_id=appointment_data.doctor_id
            )
            
            if not doctor_check.single():
                raise HTTPException(status_code=404, detail="Doctor not found")
            
            # Check for scheduling conflicts
            conflict_check = session.run(
                """
                MATCH (a:Appointment {doctor_id: $doctor_id})
                WHERE a.appointment_date = $date 
                  AND a.appointment_time = $time
                  AND a.status IN ['scheduled', 'confirmed', 'in_progress']
                RETURN a
                """,
                doctor_id=appointment_data.doctor_id,
                date=appointment_data.appointment_date,
                time=appointment_data.appointment_time
            )
            
            if conflict_check.single():
                raise HTTPException(status_code=409, detail="Time slot not available")
            
            # Create appointment
            appointment_id = str(uuid.uuid4())
            result = session.run(
                """
                CREATE (a:Appointment {
                    id: $appointment_id,
                    patient_id: $patient_id,
                    doctor_id: $doctor_id,
                    appointment_date: $appointment_date,
                    appointment_time: $appointment_time,
                    appointment_type: $appointment_type,
                    reason: $reason,
                    duration_minutes: $duration_minutes,
                    status: $status,
                    is_urgent: $is_urgent,
                    created_at: datetime(),
                    updated_at: datetime()
                })
                RETURN a
                """,
                appointment_id=appointment_id,
                patient_id=current_user["id"],
                doctor_id=appointment_data.doctor_id,
                appointment_date=appointment_data.appointment_date,
                appointment_time=appointment_data.appointment_time,
                appointment_type=appointment_data.appointment_type,
                reason=appointment_data.reason,
                duration_minutes=appointment_data.duration_minutes,
                status="scheduled" if not appointment_data.is_urgent else "urgent",
                is_urgent=appointment_data.is_urgent
            )
            
            appointment_record = result.single()
            if appointment_record:
                appointment_dict = dict(appointment_record["a"])
                appointment_dict['created_at'] = str(appointment_dict['created_at'])
                appointment_dict['updated_at'] = str(appointment_dict['updated_at'])
                
                # TODO: Send notification to doctor
                # await auto_send_notification(
                #     appointment_data.doctor_id,
                #     "New Appointment Request",
                #     f"New {appointment_data.appointment_type} appointment booked for {appointment_data.appointment_date}",
                #     "appointment",
                #     appointment_id
                # )
                
                return {
                    "success": True,
                    "message": "Appointment booked successfully",
                    "appointment": appointment_dict
                }
            else:
                raise HTTPException(status_code=500, detail="Failed to create appointment")
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/my-appointments")
def get_my_appointments(
    current_user: dict = Depends(get_current_user),
    status: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    limit: int = Query(50, le=100)
):
    """Get appointments for current user"""
    try:
        with driver.session() as session:
            if current_user["role"] == "patient":
                query = """
                MATCH (a:Appointment {patient_id: $user_id})
                OPTIONAL MATCH (d:Doctor {user_id: a.doctor_id})
                OPTIONAL MATCH (du:User {id: a.doctor_id})
                """
            elif current_user["role"] == "doctor":
                query = """
                MATCH (a:Appointment {doctor_id: $user_id})
                OPTIONAL MATCH (p:Patient {user_id: a.patient_id})
                OPTIONAL MATCH (pu:User {id: a.patient_id})
                """
            else:
                raise HTTPException(status_code=403, detail="Access denied")
            
            conditions = []
            params = {"user_id": current_user["id"], "limit": limit}
            
            if status:
                conditions.append("a.status = $status")
                params["status"] = status
            
            if date_from:
                conditions.append("a.appointment_date >= $date_from")
                params["date_from"] = date_from
            
            if date_to:
                conditions.append("a.appointment_date <= $date_to")
                params["date_to"] = date_to
            
            if conditions:
                query += " WHERE " + " AND ".join(conditions)
            
            if current_user["role"] == "patient":
                query += " RETURN a, d, du ORDER BY a.appointment_date ASC, a.appointment_time ASC LIMIT $limit"
            else:
                query += " RETURN a, p, pu ORDER BY a.appointment_date ASC, a.appointment_time ASC LIMIT $limit"
            
            result = session.run(query, params)
            
            appointments = []
            for record in result:
                appointment = dict(record["a"])
                # Convert datetime fields
                for field in ['created_at', 'updated_at']:
                    if field in appointment and appointment[field]:
                        appointment[field] = str(appointment[field])
                
                if current_user["role"] == "patient":
                    doctor = dict(record["d"]) if record["d"] else None
                    doctor_user = dict(record["du"]) if record["du"] else None
                    if doctor_user and 'password' in doctor_user:
                        del doctor_user['password']
                    appointments.append({
                        "appointment": appointment,
                        "doctor": doctor,
                        "doctor_user": doctor_user
                    })
                else:
                    patient = dict(record["p"]) if record["p"] else None
                    patient_user = dict(record["pu"]) if record["pu"] else None
                    if patient_user and 'password' in patient_user:
                        del patient_user['password']
                    appointments.append({
                        "appointment": appointment,
                        "patient": patient,
                        "patient_user": patient_user
                    })
            
            return {"appointments": appointments}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/doctor/{doctor_id}/availability")
def get_doctor_availability(
    doctor_id: str,
    date: Optional[str] = Query(None),  # YYYY-MM-DD
    days_ahead: int = Query(7, le=30)
):
    """Get doctor's availability for booking"""
    try:
        with driver.session() as session:
            # Get doctor info
            doctor_result = session.run(
                """
                MATCH (d:Doctor {user_id: $doctor_id})
                RETURN d
                """,
                doctor_id=doctor_id
            )
            
            doctor_record = doctor_result.single()
            if not doctor_record:
                raise HTTPException(status_code=404, detail="Doctor not found")
            
            doctor = dict(doctor_record["d"])
            
            # Generate date range
            start_date = datetime.strptime(date, "%Y-%m-%d") if date else datetime.now()
            end_date = start_date + timedelta(days=days_ahead)
            
            # Get existing appointments
            appointments_result = session.run(
                """
                MATCH (a:Appointment {doctor_id: $doctor_id})
                WHERE a.appointment_date >= $start_date 
                  AND a.appointment_date <= $end_date
                  AND a.status IN ['scheduled', 'confirmed', 'in_progress']
                RETURN a.appointment_date as date, a.appointment_time as time, a.duration_minutes as duration
                """,
                doctor_id=doctor_id,
                start_date=start_date.strftime("%Y-%m-%d"),
                end_date=end_date.strftime("%Y-%m-%d")
            )
            
            booked_slots = set()
            for record in appointments_result:
                booked_slots.add(f"{record['date']}_{record['time']}")
            
            # Generate available slots
            available_days = doctor.get("available_days", ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"])
            available_hours = doctor.get("available_hours", "09:00-17:00")
            
            start_time, end_time = available_hours.split("-")
            start_hour = int(start_time.split(":")[0])
            end_hour = int(end_time.split(":")[0])
            
            availability = []
            current_date = start_date
            
            while current_date <= end_date:
                day_name = current_date.strftime("%A")
                
                if day_name in available_days:
                    date_str = current_date.strftime("%Y-%m-%d")
                    day_slots = []
                    
                    # Generate hourly slots
                    for hour in range(start_hour, end_hour):
                        for minute in [0, 30]:  # 30-minute slots
                            time_str = f"{hour:02d}:{minute:02d}"
                            slot_key = f"{date_str}_{time_str}"
                            
                            day_slots.append({
                                "time": time_str,
                                "is_available": slot_key not in booked_slots,
                                "duration_minutes": 30
                            })
                    
                    availability.append({
                        "date": date_str,
                        "day_name": day_name,
                        "slots": day_slots
                    })
                
                current_date += timedelta(days=1)
            
            return {"availability": availability}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{appointment_id}/update")
def update_appointment(
    appointment_id: str,
    update_data: AppointmentUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update appointment (doctors and patients can update)"""
    try:
        with driver.session() as session:
            # Check access permissions
            access_query = """
            MATCH (a:Appointment {id: $appointment_id})
            WHERE a.patient_id = $user_id OR a.doctor_id = $user_id
            RETURN a
            """
            
            access_result = session.run(access_query, 
                appointment_id=appointment_id, 
                user_id=current_user["id"]
            )
            
            if not access_result.single():
                raise HTTPException(status_code=403, detail="Access denied")
            
            # Build update query
            set_clauses = ["a.updated_at = datetime()"]
            params = {"appointment_id": appointment_id}
            
            if update_data.status is not None:
                set_clauses.append("a.status = $status")
                params["status"] = update_data.status
                
                # Add completion time if completed
                if update_data.status == "completed":
                    set_clauses.append("a.completed_at = datetime()")
            
            if update_data.notes is not None:
                set_clauses.append("a.notes = $notes")
                params["notes"] = update_data.notes
            
            if update_data.actual_duration is not None:
                set_clauses.append("a.actual_duration = $actual_duration")
                params["actual_duration"] = update_data.actual_duration
            
            if update_data.follow_up_required is not None:
                set_clauses.append("a.follow_up_required = $follow_up_required")
                params["follow_up_required"] = update_data.follow_up_required
            
            if update_data.follow_up_date is not None:
                set_clauses.append("a.follow_up_date = $follow_up_date")
                params["follow_up_date"] = update_data.follow_up_date
            
            update_query = f"""
            MATCH (a:Appointment {{id: $appointment_id}})
            SET {', '.join(set_clauses)}
            RETURN a
            """
            
            result = session.run(update_query, params)
            
            updated_appointment = result.single()
            if updated_appointment:
                appointment_dict = dict(updated_appointment["a"])
                # Convert datetime fields
                for field in ['created_at', 'updated_at', 'completed_at']:
                    if field in appointment_dict and appointment_dict[field]:
                        appointment_dict[field] = str(appointment_dict[field])
                
                return {
                    "success": True,
                    "message": "Appointment updated successfully",
                    "appointment": appointment_dict
                }
            else:
                raise HTTPException(status_code=500, detail="Failed to update appointment")
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/upcoming")
def get_upcoming_appointments(
    current_user: dict = Depends(get_current_user),
    days_ahead: int = Query(7, le=30)
):
    """Get upcoming appointments"""
    try:
        today = datetime.now().strftime("%Y-%m-%d")
        future_date = (datetime.now() + timedelta(days=days_ahead)).strftime("%Y-%m-%d")
        
        with driver.session() as session:
            if current_user["role"] == "patient":
                query = """
                MATCH (a:Appointment {patient_id: $user_id})
                OPTIONAL MATCH (d:Doctor {user_id: a.doctor_id})
                OPTIONAL MATCH (du:User {id: a.doctor_id})
                WHERE a.appointment_date >= $today 
                  AND a.appointment_date <= $future_date
                  AND a.status IN ['scheduled', 'confirmed']
                RETURN a, d, du
                ORDER BY a.appointment_date ASC, a.appointment_time ASC
                """
            elif current_user["role"] == "doctor":
                query = """
                MATCH (a:Appointment {doctor_id: $user_id})
                OPTIONAL MATCH (p:Patient {user_id: a.patient_id})
                OPTIONAL MATCH (pu:User {id: a.patient_id})
                WHERE a.appointment_date >= $today 
                  AND a.appointment_date <= $future_date
                  AND a.status IN ['scheduled', 'confirmed']
                RETURN a, p, pu
                ORDER BY a.appointment_date ASC, a.appointment_time ASC
                """
            else:
                raise HTTPException(status_code=403, detail="Access denied")
            
            result = session.run(query, 
                user_id=current_user["id"],
                today=today,
                future_date=future_date
            )
            
            appointments = []
            for record in result:
                appointment = dict(record["a"])
                # Convert datetime fields
                for field in ['created_at', 'updated_at']:
                    if field in appointment and appointment[field]:
                        appointment[field] = str(appointment[field])
                
                if current_user["role"] == "patient":
                    doctor = dict(record["d"]) if record["d"] else None
                    doctor_user = dict(record["du"]) if record["du"] else None
                    if doctor_user and 'password' in doctor_user:
                        del doctor_user['password']
                    appointments.append({
                        "appointment": appointment,
                        "doctor": doctor,
                        "doctor_user": doctor_user
                    })
                else:
                    patient = dict(record["p"]) if record["p"] else None
                    patient_user = dict(record["pu"]) if record["pu"] else None
                    if patient_user and 'password' in patient_user:
                        del patient_user['password']
                    appointments.append({
                        "appointment": appointment,
                        "patient": patient,
                        "patient_user": patient_user
                    })
            
            return {"appointments": appointments}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{appointment_id}/cancel")
def cancel_appointment(
    appointment_id: str,
    reason: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Cancel an appointment"""
    try:
        with driver.session() as session:
            # Check access permissions
            access_query = """
            MATCH (a:Appointment {id: $appointment_id})
            WHERE a.patient_id = $user_id OR a.doctor_id = $user_id
            RETURN a
            """
            
            access_result = session.run(access_query, 
                appointment_id=appointment_id, 
                user_id=current_user["id"]
            )
            
            appointment_record = access_result.single()
            if not appointment_record:
                raise HTTPException(status_code=403, detail="Access denied")
            
            appointment = dict(appointment_record["a"])
            
            # Check if appointment can be cancelled
            if appointment["status"] in ["completed", "cancelled"]:
                raise HTTPException(status_code=400, detail="Cannot cancel this appointment")
            
            # Cancel appointment
            result = session.run(
                """
                MATCH (a:Appointment {id: $appointment_id})
                SET a.status = 'cancelled',
                    a.cancelled_at = datetime(),
                    a.cancelled_by = $cancelled_by,
                    a.cancellation_reason = $reason,
                    a.updated_at = datetime()
                RETURN a
                """,
                appointment_id=appointment_id,
                cancelled_by=current_user["id"],
                reason=reason
            )
            
            updated_appointment = result.single()
            if updated_appointment:
                appointment_dict = dict(updated_appointment["a"])
                # Convert datetime fields
                for field in ['created_at', 'updated_at', 'cancelled_at']:
                    if field in appointment_dict and appointment_dict[field]:
                        appointment_dict[field] = str(appointment_dict[field])
                
                # TODO: Send notification to other party
                
                return {
                    "success": True,
                    "message": "Appointment cancelled successfully",
                    "appointment": appointment_dict
                }
            else:
                raise HTTPException(status_code=500, detail="Failed to cancel appointment")
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats/dashboard")
def get_appointment_stats(current_user: dict = Depends(get_current_user)):
    """Get appointment statistics for dashboard"""
    try:
        with driver.session() as session:
            if current_user["role"] == "patient":
                result = session.run(
                    """
                    MATCH (a:Appointment {patient_id: $user_id})
                    RETURN 
                        count(a) as total,
                        count(CASE WHEN a.status = 'scheduled' THEN 1 END) as scheduled,
                        count(CASE WHEN a.status = 'confirmed' THEN 1 END) as confirmed,
                        count(CASE WHEN a.status = 'completed' THEN 1 END) as completed,
                        count(CASE WHEN a.status = 'cancelled' THEN 1 END) as cancelled
                    """,
                    user_id=current_user["id"]
                )
            elif current_user["role"] == "doctor":
                result = session.run(
                    """
                    MATCH (a:Appointment {doctor_id: $user_id})
                    RETURN 
                        count(a) as total,
                        count(CASE WHEN a.status = 'scheduled' THEN 1 END) as scheduled,
                        count(CASE WHEN a.status = 'confirmed' THEN 1 END) as confirmed,
                        count(CASE WHEN a.status = 'completed' THEN 1 END) as completed,
                        count(CASE WHEN a.status = 'cancelled' THEN 1 END) as cancelled
                    """,
                    user_id=current_user["id"]
                )
            else:
                # Admin stats
                result = session.run(
                    """
                    MATCH (a:Appointment)
                    RETURN 
                        count(a) as total,
                        count(CASE WHEN a.status = 'scheduled' THEN 1 END) as scheduled,
                        count(CASE WHEN a.status = 'confirmed' THEN 1 END) as confirmed,
                        count(CASE WHEN a.status = 'completed' THEN 1 END) as completed,
                        count(CASE WHEN a.status = 'cancelled' THEN 1 END) as cancelled
                    """
                )
            
            stats = result.single()
            return dict(stats) if stats else {}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
