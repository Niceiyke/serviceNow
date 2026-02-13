import os
import uuid
import shutil
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.api import deps
from app.core.database import get_db
from app.models.models import Attachment, Incident, User, UserRole
from app.schemas.attachment import AttachmentInDB
from pydantic import UUID4

router = APIRouter()

UPLOAD_DIR = "uploads"

@router.post("/{incident_id}/upload", response_model=AttachmentInDB)
async def upload_attachment(
    incident_id: UUID4,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    # Permission check: Reporter can only upload to their own incident
    if current_user.role == UserRole.REPORTER and incident.reporter_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    # Create upload directory if it doesn't exist
    if not os.path.exists(UPLOAD_DIR):
        os.makedirs(UPLOAD_DIR)

    file_ext = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Get file size
    file_size = os.path.getsize(file_path)
    # Format file size
    if file_size < 1024:
        size_str = f"{file_size} B"
    elif file_size < 1024 * 1024:
        size_str = f"{file_size / 1024:.2f} KB"
    else:
        size_str = f"{file_size / (1024 * 1024):.2f} MB"

    db_obj = Attachment(
        incident_id=incident_id,
        uploader_id=current_user.id,
        file_name=file.filename,
        file_path=file_path,
        content_type=file.content_type,
        file_size=size_str
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    
    # Add uploader name for the response
    db_obj.uploader_name = current_user.full_name or current_user.email
    return db_obj

@router.get("/{incident_id}/attachments", response_model=List[AttachmentInDB])
def read_attachments(
    incident_id: UUID4,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    if current_user.role == UserRole.REPORTER and incident.reporter_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    attachments = db.query(Attachment).filter(Attachment.incident_id == incident_id).all()
    for att in attachments:
        uploader = db.query(User).filter(User.id == att.uploader_id).first()
        att.uploader_name = uploader.full_name or uploader.email if uploader else "Unknown"
        
    return attachments

@router.get("/download/{attachment_id}")
def download_attachment(
    attachment_id: UUID4,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    attachment = db.query(Attachment).filter(Attachment.id == attachment_id).first()
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")
    
    # Check if user has access to the incident
    incident = db.query(Incident).filter(Incident.id == attachment.incident_id).first()
    if current_user.role == UserRole.REPORTER and incident.reporter_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    if not os.path.exists(attachment.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")

    return FileResponse(
        attachment.file_path, 
        media_type=attachment.content_type, 
        filename=attachment.file_name
    )

@router.delete("/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_attachment(
    attachment_id: UUID4,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    attachment = db.query(Attachment).filter(Attachment.id == attachment_id).first()
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")
    
    # Only uploader or admin can delete
    if attachment.uploader_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    # Delete from disk
    if os.path.exists(attachment.file_path):
        os.remove(attachment.file_path)

    db.delete(attachment)
    db.commit()
    return None
