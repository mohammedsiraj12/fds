from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from fastapi.responses import FileResponse
import os
import uuid
from datetime import datetime
from auth.utils import get_current_user
from database.connection import driver

router = APIRouter(prefix="/files", tags=["files"])

# Create upload directory if it doesn't exist
UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

@router.post("/upload")
def upload_file(
    file: UploadFile = File(...),
    description: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload a medical record file"""
    try:
        # Validate file type
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are allowed")
        
        # Generate unique filename
        file_id = str(uuid.uuid4())
        file_extension = file.filename.split('.')[-1]
        safe_filename = f"{file_id}.{file_extension}"
        file_path = os.path.join(UPLOAD_DIR, safe_filename)
        
        # Save file
        with open(file_path, "wb") as buffer:
            content = file.file.read()
            buffer.write(content)
        
        # Save file info to Neo4j
        with driver.session() as session:
            result = session.run(
                """
                CREATE (f:MedicalRecord {
                    id: $file_id,
                    user_id: $user_id,
                    filename: $original_filename,
                    description: $description,
                    file_path: $file_path,
                    file_size: $file_size,
                    uploaded_at: datetime()
                })
                RETURN f
                """,
                file_id=file_id,
                user_id=current_user["id"],
                original_filename=file.filename,
                description=description,
                file_path=safe_filename,
                file_size=len(content)
            )
            
            record = result.single()
            if record:
                file_dict = dict(record["f"])
                file_dict['uploaded_at'] = str(file_dict['uploaded_at'])
                return {
                    "success": True,
                    "message": "File uploaded successfully",
                    "file": file_dict
                }
            else:
                raise HTTPException(status_code=500, detail="Failed to save file record")
                
    except Exception as e:
        # Clean up file if database operation failed
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/user/{user_id}")
def get_user_files(user_id: str, current_user: dict = Depends(get_current_user)):
    """Get all files for a user"""
    
    # Users can only access their own files or doctors can access patient files
    if current_user["id"] != user_id and current_user["role"] != "doctor":
        raise HTTPException(status_code=403, detail="Access denied")
    
    with driver.session() as session:
        result = session.run(
            "MATCH (f:MedicalRecord {user_id: $user_id}) RETURN f ORDER BY f.uploaded_at DESC",
            user_id=user_id
        )
        
        files = []
        for record in result:
            file_dict = dict(record["f"])
            file_dict['uploaded_at'] = str(file_dict['uploaded_at'])
            files.append(file_dict)
        
        return {"files": files}

@router.delete("/{file_id}")
def delete_file(file_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a medical record file"""
    
    with driver.session() as session:
        # Check if file exists and user owns it
        result = session.run(
            "MATCH (f:MedicalRecord {id: $file_id}) RETURN f",
            file_id=file_id
        )
        
        record = result.single()
        if not record:
            raise HTTPException(status_code=404, detail="File not found")
        
        file_data = dict(record["f"])
        
        # Check ownership
        if file_data["user_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Delete from filesystem
        file_path = os.path.join(UPLOAD_DIR, file_data["file_path"])
        if os.path.exists(file_path):
            os.remove(file_path)
        
        # Delete from database
        session.run(
            "MATCH (f:MedicalRecord {id: $file_id}) DELETE f",
            file_id=file_id
        )
        
        return {"success": True, "message": "File deleted successfully"}

@router.get("/download/{file_id}")
def download_file(file_id: str, current_user: dict = Depends(get_current_user)):
    """Download a medical record file"""
    
    with driver.session() as session:
        result = session.run(
            "MATCH (f:MedicalRecord {id: $file_id}) RETURN f",
            file_id=file_id
        )
        
        record = result.single()
        if not record:
            raise HTTPException(status_code=404, detail="File not found")
        
        file_data = dict(record["f"])
        
        # Check access permissions
        if file_data["user_id"] != current_user["id"] and current_user["role"] != "doctor":
            raise HTTPException(status_code=403, detail="Access denied")
        
        file_path = os.path.join(UPLOAD_DIR, file_data["file_path"])
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found on disk")
        
        return FileResponse(
            file_path,
            media_type='application/pdf',
            filename=file_data["filename"]
        )
