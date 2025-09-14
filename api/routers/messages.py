from fastapi import APIRouter, HTTPException
from models.message import MessageCreate
from database.connection import run_query

router = APIRouter(prefix="/messages", tags=["messages"])

@router.post("")
def create_message(message: MessageCreate):
    query = """
    MATCH (c:Consultation {id: $consultation_id})
    CREATE (m:Message {
        id: randomUUID(),
        consultation_id: $consultation_id,
        sender_id: $sender_id,
        sender_role: $sender_role,
        message: $message,
        sent_at: datetime()
    })
    CREATE (c)-[:HAS_MESSAGE]->(m)
    RETURN m
    """
    result = run_query(query, message.dict())
    if result:
        return {"success": True, "message": result[0]}
    raise HTTPException(status_code=400, detail="Failed to create message")

@router.get("/consultation/{consultation_id}")
def get_consultation_messages(consultation_id: str):
    query = """
    MATCH (c:Consultation {id: $consultation_id})-[:HAS_MESSAGE]->(m:Message)
    RETURN m
    ORDER BY m.sent_at ASC
    """
    result = run_query(query, {"consultation_id": consultation_id})
    return {"messages": result}
