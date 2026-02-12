from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api import deps
from app.core.database import get_db
from app.models.models import Incident, Comment, User, UserRole
from pydantic import BaseModel, UUID4
from datetime import datetime

router = APIRouter()

class CommentBase(BaseModel):
    content: str
    is_internal: bool = False

class CommentInDB(CommentBase):
    id: UUID4
    incident_id: UUID4
    author_id: UUID4
    created_at: datetime

    class Config:
        from_attributes = True

@router.get("/{incident_id}/comments", response_model=List[CommentInDB])
def read_comments(
    incident_id: UUID4,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    query = db.query(Comment).filter(Comment.incident_id == incident_id)
    
    # Reporters cannot see internal comments
    if current_user.role == UserRole.REPORTER:
        query = query.filter(Comment.is_internal == False)
        
    return query.all()

@router.post("/{incident_id}/comments", response_model=CommentInDB)
def create_comment(
    incident_id: UUID4,
    comment_in: CommentBase,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    if comment_in.is_internal and current_user.role == UserRole.REPORTER:
        raise HTTPException(status_code=403, detail="Reporters cannot post internal comments")

    db_obj = Comment(
        content=comment_in.content,
        is_internal=comment_in.is_internal,
        incident_id=incident_id,
        author_id=current_user.id
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj
