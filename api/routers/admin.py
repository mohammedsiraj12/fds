from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
from pydantic import BaseModel

from auth.utils import get_current_user
from database.connection import driver

router = APIRouter(prefix="/admin", tags=["admin"])

class UserManagement(BaseModel):
    user_id: str
    action: str  # activate, deactivate, suspend, delete
    reason: Optional[str] = None

class SystemSettings(BaseModel):
    setting_name: str
    setting_value: str
    category: str  # general, security, notifications, payments

def require_admin(current_user: dict = Depends(get_current_user)):
    """Dependency to require admin access"""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

@router.get("/dashboard/analytics")
def get_admin_analytics(admin_user: dict = Depends(require_admin)):
    """Get comprehensive analytics for admin dashboard"""
    try:
        with driver.session() as session:
            # User statistics
            user_stats = session.run(
                """
                MATCH (u:User)
                RETURN u.role as role, count(u) as count
                """
            )
            
            user_breakdown = {}
            total_users = 0
            for record in user_stats:
                role = record["role"]
                count = record["count"]
                user_breakdown[role] = count
                total_users += count
            
            # Consultation statistics
            consultation_stats = session.run(
                """
                MATCH (c:Consultation)
                RETURN 
                    count(c) as total,
                    count(CASE WHEN c.status = 'pending' THEN 1 END) as pending,
                    count(CASE WHEN c.status = 'answered' THEN 1 END) as answered,
                    count(CASE WHEN c.status = 'closed' THEN 1 END) as closed,
                    avg(duration.inSeconds(c.answered_at, c.created_at)) as avg_response_time_seconds
                """
            )
            
            # Appointment statistics
            appointment_stats = session.run(
                """
                MATCH (a:Appointment)
                RETURN 
                    count(a) as total,
                    count(CASE WHEN a.status = 'scheduled' THEN 1 END) as scheduled,
                    count(CASE WHEN a.status = 'completed' THEN 1 END) as completed,
                    count(CASE WHEN a.status = 'cancelled' THEN 1 END) as cancelled
                """
            )
            
            # Revenue statistics (if payment system is implemented)
            revenue_stats = session.run(
                """
                OPTIONAL MATCH (p:Payment)
                RETURN 
                    count(p) as total_payments,
                    sum(p.amount) as total_revenue,
                    avg(p.amount) as avg_payment
                """
            )
            
            # Activity in last 30 days
            thirty_days_ago = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
            activity_stats = session.run(
                """
                MATCH (u:User)
                WHERE u.created_at >= datetime($thirty_days_ago)
                RETURN count(u) as new_users
                
                UNION
                
                MATCH (c:Consultation)
                WHERE c.created_at >= datetime($thirty_days_ago)
                RETURN count(c) as new_consultations
                
                UNION
                
                MATCH (a:Appointment)
                WHERE a.created_at >= datetime($thirty_days_ago)
                RETURN count(a) as new_appointments
                """,
                thirty_days_ago=thirty_days_ago
            )
            
            # Top doctors by consultation count
            top_doctors = session.run(
                """
                MATCH (d:Doctor)-[:RESPONDED_TO]->(c:Consultation)
                OPTIONAL MATCH (u:User {id: d.user_id})
                RETURN d, u, count(c) as consultation_count
                ORDER BY consultation_count DESC
                LIMIT 10
                """
            )
            
            # Process all results
            consultation_data = consultation_stats.single()
            appointment_data = appointment_stats.single()
            revenue_data = revenue_stats.single()
            
            activity_data = {}
            for record in activity_stats:
                activity_data.update(dict(record))
            
            top_doctors_list = []
            for record in top_doctors:
                doctor = dict(record["d"]) if record["d"] else {}
                user = dict(record["u"]) if record["u"] else {}
                if 'password' in user:
                    del user['password']
                
                top_doctors_list.append({
                    "doctor": doctor,
                    "user": user,
                    "consultation_count": record["consultation_count"]
                })
            
            return {
                "overview": {
                    "total_users": total_users,
                    "user_breakdown": user_breakdown,
                    "total_consultations": consultation_data["total"] if consultation_data else 0,
                    "pending_consultations": consultation_data["pending"] if consultation_data else 0,
                    "total_appointments": appointment_data["total"] if appointment_data else 0,
                    "total_revenue": float(revenue_data["total_revenue"]) if revenue_data and revenue_data["total_revenue"] else 0.0
                },
                "performance": {
                    "avg_response_time_hours": round(consultation_data["avg_response_time_seconds"] / 3600, 2) if consultation_data and consultation_data["avg_response_time_seconds"] else 0,
                    "consultation_completion_rate": round((consultation_data["answered"] + consultation_data["closed"]) / consultation_data["total"] * 100, 2) if consultation_data and consultation_data["total"] > 0 else 0,
                    "appointment_completion_rate": round(appointment_data["completed"] / appointment_data["total"] * 100, 2) if appointment_data and appointment_data["total"] > 0 else 0
                },
                "recent_activity": activity_data,
                "top_doctors": top_doctors_list
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/users")
def get_all_users(
    admin_user: dict = Depends(require_admin),
    role: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, le=200)
):
    """Get all users with filtering"""
    try:
        with driver.session() as session:
            query = """
            MATCH (u:User)
            """
            
            conditions = []
            params = {"limit": limit}
            
            if role:
                conditions.append("u.role = $role")
                params["role"] = role
            
            if status:
                conditions.append("u.status = $status")
                params["status"] = status
            
            if search:
                conditions.append("toLower(u.email) CONTAINS toLower($search)")
                params["search"] = search
            
            if conditions:
                query += " WHERE " + " AND ".join(conditions)
            
            query += """
            OPTIONAL MATCH (u)<-[:PROFILE_OF]-(p:Patient)
            OPTIONAL MATCH (u)<-[:PROFILE_OF]-(d:Doctor)
            RETURN u, p, d
            ORDER BY u.created_at DESC
            LIMIT $limit
            """
            
            result = session.run(query, params)
            
            users = []
            for record in result:
                user = dict(record["u"])
                patient = dict(record["p"]) if record["p"] else None
                doctor = dict(record["d"]) if record["d"] else None
                
                # Remove password and convert datetime
                if 'password' in user:
                    del user['password']
                
                for item in [user, patient, doctor]:
                    if item:
                        for field in ['created_at', 'updated_at']:
                            if field in item and item[field]:
                                item[field] = str(item[field])
                
                users.append({
                    "user": user,
                    "patient_profile": patient,
                    "doctor_profile": doctor
                })
            
            return {"users": users}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/users/{user_id}/manage")
def manage_user(
    user_id: str,
    management_data: UserManagement,
    admin_user: dict = Depends(require_admin)
):
    """Manage user account (activate, deactivate, suspend, delete)"""
    try:
        with driver.session() as session:
            # Check if user exists
            user_check = session.run(
                "MATCH (u:User {id: $user_id}) RETURN u",
                user_id=user_id
            )
            
            if not user_check.single():
                raise HTTPException(status_code=404, detail="User not found")
            
            action = management_data.action
            
            if action == "activate":
                result = session.run(
                    """
                    MATCH (u:User {id: $user_id})
                    SET u.status = 'active', u.updated_at = datetime()
                    RETURN u
                    """,
                    user_id=user_id
                )
            elif action == "deactivate":
                result = session.run(
                    """
                    MATCH (u:User {id: $user_id})
                    SET u.status = 'inactive', u.updated_at = datetime()
                    RETURN u
                    """,
                    user_id=user_id
                )
            elif action == "suspend":
                result = session.run(
                    """
                    MATCH (u:User {id: $user_id})
                    SET u.status = 'suspended', 
                        u.suspension_reason = $reason,
                        u.suspended_at = datetime(),
                        u.updated_at = datetime()
                    RETURN u
                    """,
                    user_id=user_id,
                    reason=management_data.reason
                )
            elif action == "delete":
                # Soft delete - mark as deleted but keep data
                result = session.run(
                    """
                    MATCH (u:User {id: $user_id})
                    SET u.status = 'deleted',
                        u.deletion_reason = $reason,
                        u.deleted_at = datetime(),
                        u.updated_at = datetime()
                    RETURN u
                    """,
                    user_id=user_id,
                    reason=management_data.reason
                )
            else:
                raise HTTPException(status_code=400, detail="Invalid action")
            
            updated_user = result.single()
            if updated_user:
                user_dict = dict(updated_user["u"])
                if 'password' in user_dict:
                    del user_dict['password']
                
                # Convert datetime fields
                for field in ['created_at', 'updated_at', 'suspended_at', 'deleted_at']:
                    if field in user_dict and user_dict[field]:
                        user_dict[field] = str(user_dict[field])
                
                return {
                    "success": True,
                    "message": f"User {action}d successfully",
                    "user": user_dict
                }
            else:
                raise HTTPException(status_code=500, detail=f"Failed to {action} user")
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/reports/daily")
def get_daily_report(
    admin_user: dict = Depends(require_admin),
    date: Optional[str] = Query(None)  # YYYY-MM-DD
):
    """Get daily activity report"""
    try:
        report_date = date or datetime.now().strftime("%Y-%m-%d")
        
        with driver.session() as session:
            daily_stats = session.run(
                """
                // New users today
                OPTIONAL MATCH (u:User)
                WHERE date(u.created_at) = date($report_date)
                WITH count(u) as new_users
                
                // Consultations today
                OPTIONAL MATCH (c:Consultation)
                WHERE date(c.created_at) = date($report_date)
                WITH new_users, count(c) as new_consultations
                
                // Appointments today
                OPTIONAL MATCH (a:Appointment)
                WHERE a.appointment_date = $report_date
                WITH new_users, new_consultations, count(a) as appointments_today
                
                // Prescriptions today
                OPTIONAL MATCH (p:Prescription)
                WHERE date(p.created_at) = date($report_date)
                WITH new_users, new_consultations, appointments_today, count(p) as new_prescriptions
                
                RETURN new_users, new_consultations, appointments_today, new_prescriptions
                """,
                report_date=report_date
            )
            
            stats = daily_stats.single()
            
            return {
                "date": report_date,
                "statistics": {
                    "new_users": stats["new_users"] if stats else 0,
                    "new_consultations": stats["new_consultations"] if stats else 0,
                    "appointments_today": stats["appointments_today"] if stats else 0,
                    "new_prescriptions": stats["new_prescriptions"] if stats else 0
                }
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/reports/monthly")
def get_monthly_report(
    admin_user: dict = Depends(require_admin),
    year: int = Query(datetime.now().year),
    month: int = Query(datetime.now().month)
):
    """Get monthly activity report"""
    try:
        with driver.session() as session:
            monthly_stats = session.run(
                """
                // Monthly user registrations
                MATCH (u:User)
                WHERE u.created_at.year = $year AND u.created_at.month = $month
                WITH count(u) as monthly_users, collect(u.role) as user_roles
                
                // Monthly consultations
                MATCH (c:Consultation)
                WHERE c.created_at.year = $year AND c.created_at.month = $month
                WITH monthly_users, user_roles, count(c) as monthly_consultations
                
                // Monthly appointments
                MATCH (a:Appointment)
                WHERE toInteger(substring(a.appointment_date, 0, 4)) = $year 
                  AND toInteger(substring(a.appointment_date, 5, 2)) = $month
                WITH monthly_users, user_roles, monthly_consultations, count(a) as monthly_appointments
                
                // Doctor performance
                MATCH (d:Doctor)-[:RESPONDED_TO]->(c:Consultation)
                WHERE c.created_at.year = $year AND c.created_at.month = $month
                WITH monthly_users, user_roles, monthly_consultations, monthly_appointments,
                     count(c) as doctor_responses, collect(DISTINCT d.user_id) as active_doctors
                
                RETURN monthly_users, user_roles, monthly_consultations, monthly_appointments,
                       doctor_responses, size(active_doctors) as active_doctor_count
                """,
                year=year,
                month=month
            )
            
            stats = monthly_stats.single()
            
            return {
                "period": f"{year}-{month:02d}",
                "statistics": {
                    "new_users": stats["monthly_users"] if stats else 0,
                    "consultations": stats["monthly_consultations"] if stats else 0,
                    "appointments": stats["monthly_appointments"] if stats else 0,
                    "doctor_responses": stats["doctor_responses"] if stats else 0,
                    "active_doctors": stats["active_doctor_count"] if stats else 0
                }
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/system/health")
def get_system_health(admin_user: dict = Depends(require_admin)):
    """Get system health metrics"""
    try:
        with driver.session() as session:
            # Database metrics
            db_metrics = session.run(
                """
                CALL db.stats.retrieve('GRAPH COUNTS') YIELD data
                RETURN data
                """
            )
            
            # Get recent errors (if error logging is implemented)
            recent_errors = session.run(
                """
                OPTIONAL MATCH (e:ErrorLog)
                WHERE e.created_at >= datetime() - duration('P1D')
                RETURN count(e) as errors_24h, 
                       collect(e.error_type)[0..5] as recent_error_types
                """
            )
            
            # Performance metrics
            performance_check = session.run("RETURN 1 as test")
            start_time = datetime.now()
            performance_check.single()
            response_time = (datetime.now() - start_time).total_seconds() * 1000
            
            db_data = db_metrics.single()
            error_data = recent_errors.single()
            
            return {
                "database": {
                    "connection_status": "healthy",
                    "response_time_ms": round(response_time, 2),
                    "node_count": db_data["data"].get("nodeCount", 0) if db_data else 0,
                    "relationship_count": db_data["data"].get("relationshipCount", 0) if db_data else 0
                },
                "errors": {
                    "errors_24h": error_data["errors_24h"] if error_data else 0,
                    "recent_types": error_data["recent_error_types"] if error_data else []
                },
                "status": "healthy" if response_time < 1000 else "slow"
            }
            
    except Exception as e:
        # If we can't get detailed metrics, return basic health check
        return {
            "database": {
                "connection_status": "healthy",
                "response_time_ms": 0
            },
            "errors": {
                "errors_24h": 0,
                "recent_types": []
            },
            "status": "unknown"
        }

@router.post("/system/settings")
def update_system_settings(
    settings_data: SystemSettings,
    admin_user: dict = Depends(require_admin)
):
    """Update system settings"""
    try:
        with driver.session() as session:
            result = session.run(
                """
                MERGE (s:SystemSettings {name: $setting_name})
                SET s.value = $setting_value,
                    s.category = $category,
                    s.updated_by = $admin_id,
                    s.updated_at = datetime()
                RETURN s
                """,
                setting_name=settings_data.setting_name,
                setting_value=settings_data.setting_value,
                category=settings_data.category,
                admin_id=admin_user["id"]
            )
            
            setting_record = result.single()
            if setting_record:
                setting_dict = dict(setting_record["s"])
                setting_dict['updated_at'] = str(setting_dict['updated_at'])
                
                return {
                    "success": True,
                    "message": "System setting updated successfully",
                    "setting": setting_dict
                }
            else:
                raise HTTPException(status_code=500, detail="Failed to update setting")
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/system/settings")
def get_system_settings(admin_user: dict = Depends(require_admin)):
    """Get all system settings"""
    try:
        with driver.session() as session:
            result = session.run(
                """
                MATCH (s:SystemSettings)
                RETURN s
                ORDER BY s.category, s.name
                """
            )
            
            settings = {}
            for record in result:
                setting = dict(record["s"])
                if 'updated_at' in setting and setting['updated_at']:
                    setting['updated_at'] = str(setting['updated_at'])
                
                category = setting.get("category", "general")
                if category not in settings:
                    settings[category] = []
                
                settings[category].append(setting)
            
            return {"settings": settings}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/audit-log")
def get_audit_log(
    admin_user: dict = Depends(require_admin),
    action: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    limit: int = Query(100, le=500)
):
    """Get audit log of admin actions"""
    try:
        with driver.session() as session:
            query = """
            MATCH (a:AuditLog)
            OPTIONAL MATCH (u:User {id: a.admin_id})
            OPTIONAL MATCH (tu:User {id: a.target_user_id})
            """
            
            conditions = []
            params = {"limit": limit}
            
            if action:
                conditions.append("a.action = $action")
                params["action"] = action
            
            if user_id:
                conditions.append("a.admin_id = $user_id OR a.target_user_id = $user_id")
                params["user_id"] = user_id
            
            if from_date:
                conditions.append("a.created_at >= datetime($from_date)")
                params["from_date"] = from_date
            
            if conditions:
                query += " WHERE " + " AND ".join(conditions)
            
            query += """
            RETURN a, u.email as admin_email, tu.email as target_email
            ORDER BY a.created_at DESC
            LIMIT $limit
            """
            
            result = session.run(query, params)
            
            audit_entries = []
            for record in result:
                audit = dict(record["a"])
                audit['created_at'] = str(audit['created_at'])
                audit['admin_email'] = record["admin_email"]
                audit['target_email'] = record["target_email"]
                audit_entries.append(audit)
            
            return {"audit_log": audit_entries}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Helper function to log admin actions
def log_admin_action(admin_id: str, action: str, target_user_id: str = None, details: str = None):
    """Log admin actions for audit trail"""
    try:
        with driver.session() as session:
            log_id = str(uuid.uuid4())
            session.run(
                """
                CREATE (a:AuditLog {
                    id: $log_id,
                    admin_id: $admin_id,
                    action: $action,
                    target_user_id: $target_user_id,
                    details: $details,
                    created_at: datetime()
                })
                """,
                log_id=log_id,
                admin_id=admin_id,
                action=action,
                target_user_id=target_user_id,
                details=details
            )
    except Exception as e:
        print(f"Failed to log admin action: {e}")
