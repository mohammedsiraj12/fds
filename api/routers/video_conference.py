from fastapi import APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect
from typing import List, Optional, Dict
import uuid
import json
import secrets
import asyncio
from datetime import datetime, timedelta
from pydantic import BaseModel

from auth.utils import get_current_user
from database.connection import driver

router = APIRouter(prefix="/video", tags=["video-conference"])

# Video conference connection manager
class VideoConnectionManager:
    def __init__(self):
        self.room_connections: Dict[str, Dict[str, WebSocket]] = {}
        self.user_rooms: Dict[str, str] = {}
    
    async def join_room(self, websocket: WebSocket, room_id: str, user_id: str, user_role: str):
        await websocket.accept()
        
        if room_id not in self.room_connections:
            self.room_connections[room_id] = {}
        
        self.room_connections[room_id][user_id] = websocket
        self.user_rooms[user_id] = room_id
        
        # Notify others in the room
        await self.broadcast_to_room(
            json.dumps({
                "type": "user_joined",
                "user_id": user_id,
                "user_role": user_role,
                "timestamp": datetime.now().isoformat()
            }),
            room_id,
            exclude_user=user_id
        )
    
    def leave_room(self, user_id: str):
        if user_id in self.user_rooms:
            room_id = self.user_rooms[user_id]
            
            if room_id in self.room_connections and user_id in self.room_connections[room_id]:
                del self.room_connections[room_id][user_id]
                
                # Notify others in the room
                asyncio.create_task(self.broadcast_to_room(
                    json.dumps({
                        "type": "user_left",
                        "user_id": user_id,
                        "timestamp": datetime.now().isoformat()
                    }),
                    room_id,
                    exclude_user=user_id
                ))
                
                # Clean up empty rooms
                if not self.room_connections[room_id]:
                    del self.room_connections[room_id]
            
            del self.user_rooms[user_id]
    
    async def broadcast_to_room(self, message: str, room_id: str, exclude_user: str = None):
        if room_id in self.room_connections:
            for user_id, connection in self.room_connections[room_id].items():
                if user_id != exclude_user:
                    try:
                        await connection.send_text(message)
                    except:
                        # Remove broken connections
                        del self.room_connections[room_id][user_id]
                        if user_id in self.user_rooms:
                            del self.user_rooms[user_id]

video_manager = VideoConnectionManager()

class VideoRoomCreate(BaseModel):
    consultation_id: Optional[str] = None
    appointment_id: Optional[str] = None
    participant_id: str  # patient or doctor to invite
    room_type: str = "consultation"  # consultation, appointment, emergency
    duration_minutes: int = 30
    scheduled_start: Optional[str] = None

class VideoRoomUpdate(BaseModel):
    status: str  # scheduled, active, ended, cancelled
    actual_duration: Optional[int] = None
    recording_url: Optional[str] = None
    summary: Optional[str] = None

@router.post("/rooms/create")
def create_video_room(
    room_data: VideoRoomCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a video conference room"""
    try:
        with driver.session() as session:
            # Verify access to consultation/appointment
            if room_data.consultation_id:
                access_check = session.run(
                    """
                    MATCH (c:Consultation {id: $consultation_id})
                    WHERE c.patient_id = $user_id OR (c)<-[:RESPONDED_TO]-(:Doctor {user_id: $user_id})
                    RETURN c
                    """,
                    consultation_id=room_data.consultation_id,
                    user_id=current_user["id"]
                )
            elif room_data.appointment_id:
                access_check = session.run(
                    """
                    MATCH (a:Appointment {id: $appointment_id})
                    WHERE a.patient_id = $user_id OR a.doctor_id = $user_id
                    RETURN a
                    """,
                    appointment_id=room_data.appointment_id,
                    user_id=current_user["id"]
                )
            else:
                # Direct room creation
                access_check = session.run("RETURN true as access")
            
            if not access_check.single():
                raise HTTPException(status_code=403, detail="Access denied")
            
            # Create video room
            room_id = str(uuid.uuid4())
            room_token = secrets.token_urlsafe(32)
            
            result = session.run(
                """
                CREATE (v:VideoRoom {
                    id: $room_id,
                    token: $room_token,
                    host_id: $host_id,
                    participant_id: $participant_id,
                    consultation_id: $consultation_id,
                    appointment_id: $appointment_id,
                    room_type: $room_type,
                    duration_minutes: $duration_minutes,
                    scheduled_start: $scheduled_start,
                    status: 'scheduled',
                    created_at: datetime(),
                    updated_at: datetime()
                })
                RETURN v
                """,
                room_id=room_id,
                room_token=room_token,
                host_id=current_user["id"],
                participant_id=room_data.participant_id,
                consultation_id=room_data.consultation_id,
                appointment_id=room_data.appointment_id,
                room_type=room_data.room_type,
                duration_minutes=room_data.duration_minutes,
                scheduled_start=room_data.scheduled_start
            )
            
            room_record = result.single()
            if room_record:
                room_dict = dict(room_record["v"])
                room_dict['created_at'] = str(room_dict['created_at'])
                room_dict['updated_at'] = str(room_dict['updated_at'])
                
                # Send invitation notification to participant
                # TODO: Auto-send notification
                
                return {
                    "success": True,
                    "message": "Video room created successfully",
                    "room": room_dict,
                    "join_url": f"/video/room/{room_id}?token={room_token}"
                }
            else:
                raise HTTPException(status_code=500, detail="Failed to create video room")
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/rooms/{room_id}")
def get_video_room(
    room_id: str,
    token: str,
    current_user: dict = Depends(get_current_user)
):
    """Get video room details and verify access"""
    try:
        with driver.session() as session:
            result = session.run(
                """
                MATCH (v:VideoRoom {id: $room_id})
                WHERE v.token = $token
                  AND (v.host_id = $user_id OR v.participant_id = $user_id)
                OPTIONAL MATCH (h:User {id: v.host_id})
                OPTIONAL MATCH (p:User {id: v.participant_id})
                RETURN v, h.email as host_email, p.email as participant_email
                """,
                room_id=room_id,
                token=token,
                user_id=current_user["id"]
            )
            
            room_record = result.single()
            if not room_record:
                raise HTTPException(status_code=403, detail="Invalid room or access denied")
            
            room = dict(room_record["v"])
            room['created_at'] = str(room['created_at'])
            room['updated_at'] = str(room['updated_at'])
            
            return {
                "room": room,
                "host_email": room_record["host_email"],
                "participant_email": room_record["participant_email"],
                "is_host": room["host_id"] == current_user["id"]
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.websocket("/rooms/{room_id}/ws")
async def video_room_websocket(
    websocket: WebSocket,
    room_id: str,
    token: str,
    user_id: str,
    user_role: str
):
    """WebSocket endpoint for video room signaling"""
    try:
        # Verify room access first
        with driver.session() as session:
            room_result = session.run(
                """
                MATCH (v:VideoRoom {id: $room_id})
                WHERE v.token = $token
                  AND (v.host_id = $user_id OR v.participant_id = $user_id)
                RETURN v
                """,
                room_id=room_id,
                token=token,
                user_id=user_id
            )
            
            if not room_result.single():
                await websocket.close(code=403, reason="Access denied")
                return
        
        await video_manager.join_room(websocket, room_id, user_id, user_role)
        
        try:
            while True:
                data = await websocket.receive_text()
                message_data = json.loads(data)
                
                # Handle different types of video signaling messages
                if message_data["type"] == "offer":
                    await video_manager.broadcast_to_room(
                        json.dumps({
                            "type": "offer",
                            "from": user_id,
                            "offer": message_data["offer"]
                        }),
                        room_id,
                        exclude_user=user_id
                    )
                elif message_data["type"] == "answer":
                    await video_manager.broadcast_to_room(
                        json.dumps({
                            "type": "answer",
                            "from": user_id,
                            "answer": message_data["answer"]
                        }),
                        room_id,
                        exclude_user=user_id
                    )
                elif message_data["type"] == "ice-candidate":
                    await video_manager.broadcast_to_room(
                        json.dumps({
                            "type": "ice-candidate",
                            "from": user_id,
                            "candidate": message_data["candidate"]
                        }),
                        room_id,
                        exclude_user=user_id
                    )
                elif message_data["type"] == "chat":
                    # Save chat message
                    with driver.session() as session:
                        session.run(
                            """
                            MATCH (v:VideoRoom {id: $room_id})
                            CREATE (m:VideoRoomMessage {
                                id: randomUUID(),
                                room_id: $room_id,
                                sender_id: $user_id,
                                message: $message,
                                timestamp: datetime()
                            })
                            CREATE (v)-[:HAS_MESSAGE]->(m)
                            """,
                            room_id=room_id,
                            user_id=user_id,
                            message=message_data["message"]
                        )
                    
                    await video_manager.broadcast_to_room(
                        json.dumps({
                            "type": "chat",
                            "from": user_id,
                            "message": message_data["message"],
                            "timestamp": datetime.now().isoformat()
                        }),
                        room_id
                    )
                
        except WebSocketDisconnect:
            video_manager.leave_room(user_id)
    
    except Exception as e:
        await websocket.close(code=500, reason=str(e))

@router.put("/rooms/{room_id}/status")
def update_room_status(
    room_id: str,
    update_data: VideoRoomUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update video room status"""
    try:
        with driver.session() as session:
            # Check access permissions
            access_result = session.run(
                """
                MATCH (v:VideoRoom {id: $room_id})
                WHERE v.host_id = $user_id OR v.participant_id = $user_id
                RETURN v
                """,
                room_id=room_id,
                user_id=current_user["id"]
            )
            
            if not access_result.single():
                raise HTTPException(status_code=403, detail="Access denied")
            
            # Build update query
            set_clauses = ["v.updated_at = datetime()"]
            params = {"room_id": room_id}
            
            if update_data.status:
                set_clauses.append("v.status = $status")
                params["status"] = update_data.status
                
                # Add timestamps for status changes
                if update_data.status == "active":
                    set_clauses.append("v.started_at = datetime()")
                elif update_data.status == "ended":
                    set_clauses.append("v.ended_at = datetime()")
            
            if update_data.actual_duration is not None:
                set_clauses.append("v.actual_duration = $actual_duration")
                params["actual_duration"] = update_data.actual_duration
            
            if update_data.recording_url:
                set_clauses.append("v.recording_url = $recording_url")
                params["recording_url"] = update_data.recording_url
            
            if update_data.summary:
                set_clauses.append("v.summary = $summary")
                params["summary"] = update_data.summary
            
            update_query = f"""
            MATCH (v:VideoRoom {{id: $room_id}})
            SET {', '.join(set_clauses)}
            RETURN v
            """
            
            result = session.run(update_query, params)
            
            updated_room = result.single()
            if updated_room:
                room_dict = dict(updated_room["v"])
                # Convert datetime fields
                for field in ['created_at', 'updated_at', 'started_at', 'ended_at']:
                    if field in room_dict and room_dict[field]:
                        room_dict[field] = str(room_dict[field])
                
                return {
                    "success": True,
                    "message": "Room status updated successfully",
                    "room": room_dict
                }
            else:
                raise HTTPException(status_code=500, detail="Failed to update room")
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/rooms/my-rooms")
def get_my_video_rooms(
    current_user: dict = Depends(get_current_user),
    status: Optional[str] = None,
    limit: int = 20
):
    """Get video rooms for current user"""
    try:
        with driver.session() as session:
            query = """
            MATCH (v:VideoRoom)
            WHERE v.host_id = $user_id OR v.participant_id = $user_id
            """
            
            params = {"user_id": current_user["id"], "limit": limit}
            
            if status:
                query += " AND v.status = $status"
                params["status"] = status
            
            query += """
            OPTIONAL MATCH (h:User {id: v.host_id})
            OPTIONAL MATCH (p:User {id: v.participant_id})
            OPTIONAL MATCH (c:Consultation {id: v.consultation_id})
            OPTIONAL MATCH (a:Appointment {id: v.appointment_id})
            RETURN v, h.email as host_email, p.email as participant_email, c, a
            ORDER BY v.created_at DESC
            LIMIT $limit
            """
            
            result = session.run(query, params)
            
            rooms = []
            for record in result:
                room = dict(record["v"])
                # Convert datetime fields
                for field in ['created_at', 'updated_at', 'started_at', 'ended_at']:
                    if field in room and room[field]:
                        room[field] = str(room[field])
                
                consultation = dict(record["c"]) if record["c"] else None
                appointment = dict(record["a"]) if record["a"] else None
                
                rooms.append({
                    "room": room,
                    "host_email": record["host_email"],
                    "participant_email": record["participant_email"],
                    "consultation": consultation,
                    "appointment": appointment,
                    "is_host": room["host_id"] == current_user["id"]
                })
            
            return {"rooms": rooms}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/rooms/{room_id}/invite")
def send_video_invite(
    room_id: str,
    invite_message: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Send video conference invitation"""
    try:
        with driver.session() as session:
            # Get room details
            room_result = session.run(
                """
                MATCH (v:VideoRoom {id: $room_id})
                WHERE v.host_id = $user_id
                RETURN v
                """,
                room_id=room_id,
                user_id=current_user["id"]
            )
            
            room_record = room_result.single()
            if not room_record:
                raise HTTPException(status_code=403, detail="Only room host can send invitations")
            
            room = dict(room_record["v"])
            
            # Send invitation notification
            # TODO: Integrate with notification system
            invitation_message = invite_message or f"You're invited to a video consultation. Join at your scheduled time."
            
            return {
                "success": True,
                "message": "Invitation sent successfully",
                "join_url": f"/video/room/{room_id}?token={room['token']}",
                "room_id": room_id
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/rooms/{room_id}/messages")
def get_room_messages(
    room_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get chat messages from video room"""
    try:
        with driver.session() as session:
            # Check access
            access_result = session.run(
                """
                MATCH (v:VideoRoom {id: $room_id})
                WHERE v.host_id = $user_id OR v.participant_id = $user_id
                RETURN v
                """,
                room_id=room_id,
                user_id=current_user["id"]
            )
            
            if not access_result.single():
                raise HTTPException(status_code=403, detail="Access denied")
            
            # Get messages
            messages_result = session.run(
                """
                MATCH (v:VideoRoom {id: $room_id})-[:HAS_MESSAGE]->(m:VideoRoomMessage)
                OPTIONAL MATCH (u:User {id: m.sender_id})
                RETURN m, u.email as sender_email
                ORDER BY m.timestamp ASC
                """,
                room_id=room_id
            )
            
            messages = []
            for record in messages_result:
                message = dict(record["m"])
                message['timestamp'] = str(message['timestamp'])
                message['sender_email'] = record["sender_email"]
                messages.append(message)
            
            return {"messages": messages}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/emergency/create")
def create_emergency_video_room(current_user: dict = Depends(get_current_user)):
    """Create emergency video room with immediate availability"""
    if current_user["role"] != "patient":
        raise HTTPException(status_code=403, detail="Only patients can create emergency rooms")
    
    try:
        with driver.session() as session:
            # Find available emergency doctors
            available_doctors = session.run(
                """
                MATCH (d:Doctor)
                OPTIONAL MATCH (u:User {id: d.user_id})
                WHERE u.role = 'doctor' 
                  AND (d.emergency_available = true OR d.specialization = 'Emergency Medicine')
                  AND (u.status IS NULL OR u.status = 'active')
                RETURN d, u
                ORDER BY d.rating DESC
                LIMIT 1
                """
            )
            
            doctor_record = available_doctors.single()
            if not doctor_record:
                raise HTTPException(status_code=503, detail="No emergency doctors available right now")
            
            doctor = dict(doctor_record["d"])
            
            # Create emergency room
            room_id = str(uuid.uuid4())
            room_token = secrets.token_urlsafe(32)
            
            result = session.run(
                """
                CREATE (v:VideoRoom {
                    id: $room_id,
                    token: $room_token,
                    host_id: $patient_id,
                    participant_id: $doctor_id,
                    room_type: 'emergency',
                    duration_minutes: 60,
                    status: 'emergency_pending',
                    priority: 'high',
                    created_at: datetime(),
                    updated_at: datetime()
                })
                RETURN v
                """,
                room_id=room_id,
                room_token=room_token,
                patient_id=current_user["id"],
                doctor_id=doctor["user_id"]
            )
            
            room_record = result.single()
            if room_record:
                room_dict = dict(room_record["v"])
                room_dict['created_at'] = str(room_dict['created_at'])
                room_dict['updated_at'] = str(room_dict['updated_at'])
                
                # TODO: Send urgent notification to doctor
                
                return {
                    "success": True,
                    "message": "Emergency video room created. Doctor will be notified immediately.",
                    "room": room_dict,
                    "assigned_doctor": {
                        "name": doctor.get("full_name", "Emergency Doctor"),
                        "specialization": doctor.get("specialization", "Emergency Medicine")
                    },
                    "estimated_response": "2-5 minutes",
                    "join_url": f"/video/room/{room_id}?token={room_token}"
                }
            else:
                raise HTTPException(status_code=500, detail="Failed to create emergency room")
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/rooms/{room_id}/recording")
def get_room_recording(
    room_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get recording of video session (if available)"""
    try:
        with driver.session() as session:
            # Check access and get recording info
            result = session.run(
                """
                MATCH (v:VideoRoom {id: $room_id})
                WHERE v.host_id = $user_id OR v.participant_id = $user_id
                RETURN v.recording_url as recording_url, v.status as status
                """,
                room_id=room_id,
                user_id=current_user["id"]
            )
            
            record = result.single()
            if not record:
                raise HTTPException(status_code=403, detail="Access denied")
            
            if not record["recording_url"]:
                return {
                    "available": False,
                    "message": "No recording available for this session"
                }
            
            return {
                "available": True,
                "recording_url": record["recording_url"],
                "status": record["status"]
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats/usage")
def get_video_usage_stats(current_user: dict = Depends(get_current_user)):
    """Get video conference usage statistics"""
    try:
        with driver.session() as session:
            if current_user["role"] == "admin":
                # Admin gets platform-wide stats
                result = session.run(
                    """
                    MATCH (v:VideoRoom)
                    RETURN 
                        count(v) as total_rooms,
                        count(CASE WHEN v.status = 'completed' THEN 1 END) as completed_sessions,
                        count(CASE WHEN v.room_type = 'emergency' THEN 1 END) as emergency_sessions,
                        avg(v.actual_duration) as avg_duration_minutes
                    """
                )
            else:
                # Users get their own stats
                result = session.run(
                    """
                    MATCH (v:VideoRoom)
                    WHERE v.host_id = $user_id OR v.participant_id = $user_id
                    RETURN 
                        count(v) as total_rooms,
                        count(CASE WHEN v.status = 'completed' THEN 1 END) as completed_sessions,
                        count(CASE WHEN v.room_type = 'emergency' THEN 1 END) as emergency_sessions,
                        avg(v.actual_duration) as avg_duration_minutes
                    """,
                    user_id=current_user["id"]
                )
            
            stats = result.single()
            return {
                "video_stats": {
                    "total_sessions": stats["total_rooms"] if stats else 0,
                    "completed_sessions": stats["completed_sessions"] if stats else 0,
                    "emergency_sessions": stats["emergency_sessions"] if stats else 0,
                    "avg_duration_minutes": round(float(stats["avg_duration_minutes"]), 2) if stats and stats["avg_duration_minutes"] else 0
                }
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
