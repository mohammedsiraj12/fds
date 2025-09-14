from fastapi import APIRouter, Depends
from auth.utils import get_current_user
from database.connection import driver

router = APIRouter(tags=["health"])

@router.get("/nodes")
def get_nodes(current_user: dict = Depends(get_current_user)):
    query = "MATCH (n) RETURN n LIMIT 10"
    with driver.session() as session:
        result = session.run(query)
        nodes = []
        for record in result:
            node = record["n"]
            nodes.append({
                "id": node.element_id,
                "labels": list(node.labels),
                "properties": dict(node)
            })
        return {"nodes": nodes}

@router.get("/health")
def health_check():
    try:
        with driver.session() as session:
            session.run("RETURN 1")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": "disconnected", "error": str(e)}
