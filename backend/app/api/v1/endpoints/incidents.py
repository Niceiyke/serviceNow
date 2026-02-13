from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session, joinedload
from app.api import deps
from app.core.database import get_db
from app.models.models import Incident, IncidentStatus, IncidentPriority, User, UserRole, AuditLog, Department, Category, Subcategory
from pydantic import BaseModel, UUID4
from datetime import datetime
from app.schemas.audit import AuditLog as AuditLogSchema
from sqlalchemy import func

router = APIRouter()

@router.get("/{id}/timeline", response_model=List[AuditLogSchema])
def read_incident_timeline(
    id: UUID4,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    incident = db.query(Incident).filter(Incident.id == id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    if current_user.role == UserRole.REPORTER and incident.reporter_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    logs = db.query(AuditLog).filter(AuditLog.incident_id == id).order_by(AuditLog.created_at.desc()).all()
    
    # Manually add actor_name if needed, or use a joinedload if relationship is set up
    # Since I didn't add the relationship in the schema earlier, I'll fetch it or add the relationship to models.py
    
    results = []
    for log in logs:
        actor = db.query(User).filter(User.id == log.actor_id).first()
        log_data = AuditLogSchema.from_orm(log)
        log_data.actor_name = actor.full_name or actor.email if actor else "System"
        results.append(log_data)
        
    return results

@router.get("/stats")
def get_incident_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    if current_user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    status_counts = db.query(
        Incident.status, func.count(Incident.id)
    ).group_by(Incident.status).all()
    
    dept_counts = db.query(
        Department.name, func.count(Incident.id)
    ).join(Incident, Incident.department_id == Department.id).group_by(Department.name).all()
    
    priority_counts = db.query(
        Incident.priority, func.count(Incident.id)
    ).group_by(Incident.priority).all()

    return {
        "by_status": {s: c for s, c in status_counts},
        "by_department": {d: c for d, c in dept_counts},
        "by_priority": {p: d for p, d in priority_counts}
    }

class IncidentBase(BaseModel):
    title: str
    description: str
    priority: IncidentPriority = IncidentPriority.MEDIUM
    category_id: UUID4
    subcategory_id: Optional[UUID4] = None
    department_id: Optional[UUID4] = None

class IncidentCreate(IncidentBase):
    pass

class IncidentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[IncidentStatus] = None
    priority: Optional[IncidentPriority] = None
    assignee_id: Optional[UUID4] = None
    category_id: Optional[UUID4] = None
    subcategory_id: Optional[UUID4] = None

class IncidentInDB(IncidentBase):
    id: UUID4
    incident_key: str
    status: IncidentStatus
    reporter_id: UUID4
    assignee_id: Optional[UUID4]
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime]
    
    reporter_name: Optional[str] = None
    department_name: Optional[str] = None
    category_name: Optional[str] = None
    subcategory_name: Optional[str] = None
    assignee_name: Optional[str] = None

    class Config:
        from_attributes = True

    @classmethod
    def from_orm_custom(cls, obj: Incident):
        return cls(
            **obj.__dict__,
            reporter_name=obj.reporter.full_name or obj.reporter.email if obj.reporter else None,
            department_name=obj.department.name if obj.department else None,
            category_name=obj.category.name if obj.category else None,
            subcategory_name=obj.subcategory.name if obj.subcategory else None,
            assignee_name=obj.assignee.full_name or obj.assignee.email if obj.assignee else None,
        )

VALID_TRANSITIONS = {
    IncidentStatus.OPEN: [IncidentStatus.IN_PROGRESS, IncidentStatus.CANCELLED],
    IncidentStatus.IN_PROGRESS: [IncidentStatus.RESOLVED, IncidentStatus.OPEN, IncidentStatus.CANCELLED],
    IncidentStatus.RESOLVED: [IncidentStatus.CLOSED, IncidentStatus.IN_PROGRESS],
    IncidentStatus.CLOSED: [],
    IncidentStatus.CANCELLED: [IncidentStatus.OPEN]
}

def send_status_notification(email: str, incident_key: str, new_status: str):
    print(f"NOTIFICATION: Sending email to {email} - Incident {incident_key} is now {new_status}")

@router.post("/", response_model=IncidentInDB)
def create_incident(
    incident_in: IncidentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    count = db.query(Incident).count()
    incident_key = f"INC-{datetime.utcnow().year}-{count + 1:03d}"
    
    # Use reporter's department if not provided
    dept_id = incident_in.department_id or current_user.department_id

    db_obj = Incident(
        **incident_in.dict(exclude={"department_id"}),
        incident_key=incident_key,
        reporter_id=current_user.id,
        department_id=dept_id,
        status=IncidentStatus.OPEN
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    
    # Log the creation
    audit = AuditLog(
        incident_id=db_obj.id,
        actor_id=current_user.id,
        action="CREATED",
        new_value=db_obj.incident_key
    )
    db.add(audit)
    db.commit()
    
    db_obj = db.query(Incident).options(
        joinedload(Incident.reporter),
        joinedload(Incident.department),
        joinedload(Incident.category),
        joinedload(Incident.subcategory),
        joinedload(Incident.assignee)
    ).filter(Incident.id == db_obj.id).first()
    return IncidentInDB.from_orm_custom(db_obj)

@router.get("/", response_model=List[IncidentInDB])
def read_incidents(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_active_user),
):
    query = db.query(Incident).options(
        joinedload(Incident.reporter),
        joinedload(Incident.department),
        joinedload(Incident.category),
        joinedload(Incident.subcategory),
        joinedload(Incident.assignee)
    )
    
    if current_user.role == UserRole.REPORTER:
        query = query.filter(Incident.reporter_id == current_user.id)
    elif current_user.role == UserRole.STAFF:
        query = query.filter(Incident.department_id == current_user.department_id)
    elif current_user.role == UserRole.MANAGER:
        query = query.filter(Incident.department_id == current_user.department_id)
        
    incidents = query.offset(skip).limit(limit).all()
    return [IncidentInDB.from_orm_custom(i) for i in incidents]

@router.get("/{id}", response_model=IncidentInDB)
def read_incident(
    id: UUID4,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    incident = db.query(Incident).options(
        joinedload(Incident.reporter),
        joinedload(Incident.department),
        joinedload(Incident.category),
        joinedload(Incident.subcategory),
        joinedload(Incident.assignee)
    ).filter(Incident.id == id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    if current_user.role == UserRole.REPORTER and incident.reporter_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    return IncidentInDB.from_orm_custom(incident)

@router.patch("/{id}", response_model=IncidentInDB)
def update_incident(
    id: UUID4,
    incident_update: IncidentUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    incident = db.query(Incident).filter(Incident.id == id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    # Access check: Reporters can only update their own incidents
    is_owner = incident.reporter_id == current_user.id
    if current_user.role == UserRole.REPORTER and not is_owner:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    # 1. Title/Description Updates
    if incident_update.title:
        audit = AuditLog(
            incident_id=incident.id,
            actor_id=current_user.id,
            action="TITLE_UPDATE",
            old_value=incident.title,
            new_value=incident_update.title
        )
        db.add(audit)
        incident.title = incident_update.title
    if incident_update.description:
        audit = AuditLog(
            incident_id=incident.id,
            actor_id=current_user.id,
            action="DESCRIPTION_UPDATE"
        )
        db.add(audit)
        incident.description = incident_update.description
    if incident_update.category_id:
        incident.category_id = incident_update.category_id
    if incident_update.subcategory_id:
        incident.subcategory_id = incident_update.subcategory_id

    # 2. State Machine Validation
    if incident_update.status:
        if incident_update.status not in VALID_TRANSITIONS[incident.status]:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid transition from {incident.status} to {incident_update.status}"
            )
        
        if incident_update.status == IncidentStatus.RESOLVED and current_user.role not in [UserRole.STAFF, UserRole.MANAGER, UserRole.ADMIN]:
            raise HTTPException(status_code=403, detail="Only staff can resolve incidents")
        
        if incident_update.status == IncidentStatus.CLOSED and not is_owner and current_user.role != UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="Only the reporter can close the incident")

        audit = AuditLog(
            incident_id=incident.id,
            actor_id=current_user.id,
            action="STATUS_CHANGE",
            old_value=incident.status,
            new_value=incident_update.status
        )
        db.add(audit)
        
        if incident_update.status == IncidentStatus.RESOLVED:
            incident.resolved_at = datetime.utcnow()
            background_tasks.add_task(
                send_status_notification, 
                incident.reporter.email, 
                incident.incident_key, 
                incident_update.status
            )
        
        incident.status = incident_update.status

    # 3. Assignment Logic
    update_data = incident_update.dict(exclude_unset=True)
    if "assignee_id" in update_data:
        if current_user.role not in [UserRole.MANAGER, UserRole.ADMIN, UserRole.STAFF]:
             raise HTTPException(status_code=403, detail="Not authorized to assign")
        
        assignee_id = update_data["assignee_id"]
        audit = AuditLog(
            incident_id=incident.id,
            actor_id=current_user.id,
            action="ASSIGNMENT",
            old_value=str(incident.assignee_id) if incident.assignee_id else "Unassigned",
            new_value=str(assignee_id) if assignee_id else "Unassigned"
        )
        db.add(audit)
        incident.assignee_id = assignee_id
        if assignee_id and incident.status == IncidentStatus.OPEN:
            incident.status = IncidentStatus.IN_PROGRESS

    # 4. Priority Logic
    if incident_update.priority:
        if current_user.role not in [UserRole.MANAGER, UserRole.ADMIN, UserRole.STAFF]:
             raise HTTPException(status_code=403, detail="Not authorized to change priority")
        
        audit = AuditLog(
            incident_id=incident.id,
            actor_id=current_user.id,
            action="PRIORITY_CHANGE",
            old_value=incident.priority,
            new_value=incident_update.priority
        )
        db.add(audit)
        incident.priority = incident_update.priority

    db.commit()
    db.refresh(incident)
    
    incident = db.query(Incident).options(
        joinedload(Incident.reporter),
        joinedload(Incident.department),
        joinedload(Incident.category),
        joinedload(Incident.subcategory),
        joinedload(Incident.assignee)
    ).filter(Incident.id == id).first()
    return IncidentInDB.from_orm_custom(incident)
