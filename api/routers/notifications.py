from fastapi import APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect
from typing import List, Optional, Dict
import uuid
import json
from datetime import datetime
from pydantic import BaseModel

from auth.utils import get_current_user
from database.connection import driver

router = APIRouter(prefix="/notifications", tags=["notifications"])

# Connection manager for WebSocket
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[user_id] = websocket
    
    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
    
    async def send_personal_message(self, message: str, user_id: str):
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].send_text(message)
                return True
            except:
                self.disconnect(user_id)
                return False
        return False
    
    async def broadcast_to_role(self, message: str, role: str):
        # This would need role tracking, simplified for now
        for user_id, connection in self.active_connections.items():
            try:
                await connection.send_text(message)
            except:
                self.disconnect(user_id)

manager = ConnectionManager()

class NotificationCreate(BaseModel):
    recipient_id: str
    title: str
    message: str
    type: str  # consultation, appointment, prescription, system
    related_id: Optional[str] = None  # ID of related consultation/appointment/etc
    action_url: Optional[str] = None

@router.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    """WebSocket endpoint for real-time notifications"""
    await manager.connect(websocket, user_id)
    try:
        while True:
            # Keep connection alive
            data = await websocket.receive_text()
            # Echo back for heartbeat
            await websocket.send_text(f"Server received: {data}")
    except WebSocketDisconnect:
        manager.disconnect(user_id)

@router.post("/send")
def send_notification(
    notification_data: NotificationCreate,
    current_user: dict = Depends(get_current_user)
):
    """Send a notification to a user"""
    try:
        with driver.session() as session:
            notification_id = str(uuid.uuid4())
            
            # Create notification in database
            result = session.run(
                """
                CREATE (n:Notification {
                    id: $notification_id,
                    sender_id: $sender_id,
                    recipient_id: $recipient_id,
                    title: $title,
                    message: $message,
                    type: $type,
                    related_id: $related_id,
                    action_url: $action_url,
                    read: false,
                    created_at: datetime()
                })
                RETURN n
                """,
                notification_id=notification_id,
                sender_id=current_user["id"],
                recipient_id=notification_data.recipient_id,
                title=notification_data.title,
                message=notification_data.message,
                type=notification_data.type,
                related_id=notification_data.related_id,
                action_url=notification_data.action_url
            )
            
            notification_record = result.single()
            if notification_record:
                notification_dict = dict(notification_record["n"])
                notification_dict['created_at'] = str(notification_dict['created_at'])
                
                # Send real-time notification via WebSocket
                notification_json = json.dumps({
                    "type": "notification",
                    "data": notification_dict
                })
                
                # Try to send via WebSocket (non-blocking)
                import asyncio
                try:
                    loop = asyncio.get_event_loop()
                    if loop.is_running():
                        asyncio.create_task(manager.send_personal_message(
                            notification_json, 
                            notification_data.recipient_id
                        ))
                except:
                    pass  # WebSocket delivery failed, notification still saved in DB
                
                return {
                    "success": True,
                    "message": "Notification sent successfully",
                    "notification": notification_dict
                }
            else:
                raise HTTPException(status_code=500, detail="Failed to create notification")
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/my-notifications")
def get_my_notifications(
    current_user: dict = Depends(get_current_user),
    unread_only: bool = False,
    limit: int = 50
):
    """Get notifications for current user"""
    try:
        with driver.session() as session:
            query = """
            MATCH (n:Notification {recipient_id: $user_id})
            """
            
            if unread_only:
                query += " WHERE n.read = false"
            
            query += " RETURN n ORDER BY n.created_at DESC LIMIT $limit"
            
            result = session.run(query, user_id=current_user["id"], limit=limit)
            
            notifications = []
            for record in result:
                notification = dict(record["n"])
                notification['created_at'] = str(notification['created_at'])
                notifications.append(notification)
            
            return {"notifications": notifications}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{notification_id}/read")
def mark_notification_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Mark notification as read"""
    try:
        with driver.session() as session:
            result = session.run(
                """
                MATCH (n:Notification {id: $notification_id, recipient_id: $user_id})
                SET n.read = true, n.read_at = datetime()
                RETURN n
                """,
                notification_id=notification_id,
                user_id=current_user["id"]
            )
            
            if result.single():
                return {"success": True, "message": "Notification marked as read"}
            else:
                raise HTTPException(status_code=404, detail="Notification not found")
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/mark-all-read")
def mark_all_notifications_read(current_user: dict = Depends(get_current_user)):
    """Mark all notifications as read"""
    try:
        with driver.session() as session:
            result = session.run(
                """
                MATCH (n:Notification {recipient_id: $user_id})
                WHERE n.read = false
                SET n.read = true, n.read_at = datetime()
                RETURN count(n) as updated_count
                """,
                user_id=current_user["id"]
            )
            
            record = result.single()
            updated_count = record["updated_count"] if record else 0
            
            return {
                "success": True,
                "message": f"Marked {updated_count} notifications as read"
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/unread-count")
def get_unread_count(current_user: dict = Depends(get_current_user)):
    """Get count of unread notifications"""
    try:
        with driver.session() as session:
            result = session.run(
                """
                MATCH (n:Notification {recipient_id: $user_id})
                WHERE n.read = false
                RETURN count(n) as unread_count
                """,
                user_id=current_user["id"]
            )
            
            record = result.single()
            unread_count = record["unread_count"] if record else 0
            
            return {"unread_count": unread_count}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Helper function to automatically send notifications
async def auto_send_notification(
    recipient_id: str,
    title: str,
    message: str,
    notification_type: str,
    related_id: str = None,
    action_url: str = None
):
    """Helper function to automatically send notifications"""
    try:
        with driver.session() as session:
            notification_id = str(uuid.uuid4())
            
            result = session.run(
                """
                CREATE (n:Notification {
                    id: $notification_id,
                    sender_id: 'system',
                    recipient_id: $recipient_id,
                    title: $title,
                    message: $message,
                    type: $type,
                    related_id: $related_id,
                    action_url: $action_url,
                    read: false,
                    created_at: datetime()
                })
                RETURN n
                """,
                notification_id=notification_id,
                recipient_id=recipient_id,
                title=title,
                message=message,
                type=notification_type,
                related_id=related_id,
                action_url=action_url
            )
            
            notification_record = result.single()
            if notification_record:
                notification_dict = dict(notification_record["n"])
                notification_dict['created_at'] = str(notification_dict['created_at'])
                
                # Send via WebSocket
                notification_json = json.dumps({
                    "type": "notification",
                    "data": notification_dict
                })
                
                await manager.send_personal_message(notification_json, recipient_id)
                return True
                
    except Exception as e:
        print(f"Failed to send notification: {e}")
        return False
