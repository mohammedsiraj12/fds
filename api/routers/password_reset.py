from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
import uuid
import secrets
from datetime import datetime, timedelta
from pydantic import BaseModel

from auth.utils import get_password_hash, get_current_user
from database.connection import driver

router = APIRouter(prefix="/password-reset", tags=["password-reset"])

class PasswordResetRequest(BaseModel):
    email: str

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

@router.post("/request")
def request_password_reset(reset_data: PasswordResetRequest):
    """Request password reset (generates reset token)"""
    try:
        with driver.session() as session:
            # Check if user exists
            user_result = session.run(
                "MATCH (u:User {email: $email}) RETURN u",
                email=reset_data.email
            )
            
            user_record = user_result.single()
            if not user_record:
                # Don't reveal if email exists or not for security
                return {
                    "success": True,
                    "message": "If the email exists, a reset link has been sent"
                }
            
            user = dict(user_record["u"])
            
            # Generate reset token
            reset_token = secrets.token_urlsafe(32)
            expires_at = datetime.now() + timedelta(hours=1)  # Token expires in 1 hour
            
            # Store reset token
            session.run(
                """
                MERGE (r:PasswordReset {user_id: $user_id})
                SET r.token = $token,
                    r.expires_at = datetime($expires_at),
                    r.created_at = datetime(),
                    r.used = false
                RETURN r
                """,
                user_id=user["id"],
                token=reset_token,
                expires_at=expires_at.isoformat()
            )
            
            # In a real app, you would send an email here
            # For demo purposes, we'll return the token (NEVER do this in production!)
            return {
                "success": True,
                "message": "Password reset token generated",
                "reset_token": reset_token,  # Remove this in production!
                "expires_in": "1 hour",
                "note": "In production, this would be sent via email"
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/confirm")
def confirm_password_reset(reset_data: PasswordResetConfirm):
    """Confirm password reset with token"""
    try:
        with driver.session() as session:
            # Check if token is valid and not expired
            token_result = session.run(
                """
                MATCH (r:PasswordReset {token: $token})
                WHERE r.expires_at > datetime() AND r.used = false
                MATCH (u:User {id: r.user_id})
                RETURN r, u
                """,
                token=reset_data.token
            )
            
            token_record = token_result.single()
            if not token_record:
                raise HTTPException(status_code=400, detail="Invalid or expired reset token")
            
            reset_info = dict(token_record["r"])
            user = dict(token_record["u"])
            
            # Validate new password
            if len(reset_data.new_password) < 6:
                raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
            
            # Hash new password
            hashed_password = get_password_hash(reset_data.new_password)
            
            # Update password and mark token as used
            session.run(
                """
                MATCH (u:User {id: $user_id})
                SET u.password = $hashed_password,
                    u.password_updated_at = datetime(),
                    u.updated_at = datetime()
                
                WITH u
                MATCH (r:PasswordReset {token: $token})
                SET r.used = true,
                    r.used_at = datetime()
                RETURN u
                """,
                user_id=user["id"],
                hashed_password=hashed_password,
                token=reset_data.token
            )
            
            return {
                "success": True,
                "message": "Password reset successfully. You can now login with your new password."
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/change")
def change_password(
    password_data: PasswordChange,
    current_user: dict = Depends(get_current_user)
):
    """Change password for authenticated user"""
    try:
        from auth.utils import verify_password
        
        with driver.session() as session:
            # Get current user's password
            user_result = session.run(
                "MATCH (u:User {id: $user_id}) RETURN u",
                user_id=current_user["id"]
            )
            
            user_record = user_result.single()
            if not user_record:
                raise HTTPException(status_code=404, detail="User not found")
            
            user = dict(user_record["u"])
            
            # Verify current password
            if not verify_password(password_data.current_password, user["password"]):
                raise HTTPException(status_code=400, detail="Current password is incorrect")
            
            # Validate new password
            if len(password_data.new_password) < 6:
                raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
            
            if password_data.current_password == password_data.new_password:
                raise HTTPException(status_code=400, detail="New password must be different from current password")
            
            # Hash new password
            hashed_password = get_password_hash(password_data.new_password)
            
            # Update password
            session.run(
                """
                MATCH (u:User {id: $user_id})
                SET u.password = $hashed_password,
                    u.password_updated_at = datetime(),
                    u.updated_at = datetime()
                RETURN u
                """,
                user_id=current_user["id"],
                hashed_password=hashed_password
            )
            
            return {
                "success": True,
                "message": "Password changed successfully"
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/cleanup-expired")
def cleanup_expired_tokens():
    """Cleanup expired password reset tokens (admin or system job)"""
    try:
        with driver.session() as session:
            result = session.run(
                """
                MATCH (r:PasswordReset)
                WHERE r.expires_at < datetime()
                DELETE r
                RETURN count(r) as deleted_count
                """
            )
            
            record = result.single()
            deleted_count = record["deleted_count"] if record else 0
            
            return {
                "success": True,
                "message": f"Cleaned up {deleted_count} expired reset tokens"
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
