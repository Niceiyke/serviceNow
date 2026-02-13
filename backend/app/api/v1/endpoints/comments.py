from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session, joinedload
from app.api import deps
from app.core.database import get_db
from app.models.models import Incident, Comment, User, UserRole, IncidentStatus
from pydantic import BaseModel, UUID4
from datetime import datetime
from app.services.notifications import NotificationService

router = APIRouter()

class CommentBase(BaseModel):
    content: str
    is_internal: bool = False

class CommentInDB(CommentBase):
    id: UUID4
    incident_id: UUID4
    author_id: UUID4
    author_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

    @classmethod
    def from_orm_custom(cls, obj: Comment):
        return cls(
            **obj.__dict__,
            author_name=obj.author.full_name or obj.author.email if hasattr(obj, 'author') and obj.author else None
        )

@router.get("/{incident_id}/comments", response_model=List[CommentInDB])
def read_comments(
    incident_id: UUID4,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    query = db.query(Comment).options(joinedload(Comment.author)).filter(Comment.incident_id == incident_id)
    
    # Reporters cannot see internal comments
    if current_user.role == UserRole.REPORTER:
        query = query.filter(Comment.is_internal == False)
        
    comments = query.order_by(Comment.created_at.asc()).all()
    return [CommentInDB.from_orm_custom(c) for c in comments]

@router.post("/{incident_id}/comments", response_model=CommentInDB)
def create_comment(
    incident_id: UUID4,
    comment_in: CommentBase,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    if incident.status in [IncidentStatus.CLOSED, IncidentStatus.CANCELLED]:
        raise HTTPException(
            status_code=400, 
            detail=f"Comments are no longer allowed as the incident is {incident.status.lower()}"
        )
    
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
    
    # Reload with author and incident relationships for notification
    db_obj = db.query(Comment).options(
        joinedload(Comment.author),
        joinedload(Comment.incident).joinedload(Incident.reporter),
        joinedload(Comment.incident).joinedload(Incident.assignee)
    ).filter(Comment.id == db_obj.id).first()

    background_tasks.add_task(NotificationService.send_new_comment_notification, db_obj.incident, db_obj, current_user)

    return CommentInDB.from_orm_custom(db_obj)
