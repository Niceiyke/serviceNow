from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api import deps
from app.core.database import get_db
from app.models.models import Incident, IncidentStatus, IncidentPriority, User, UserRole, AuditLog
from pydantic import BaseModel, UUID4
from datetime import datetime

from sqlalchemy import func

router = APIRouter()

@router.get("/stats")
def get_incident_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    if current_user.role not in ["ADMIN", "MANAGER"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # 1. Total by Status
    status_counts = db.query(
        Incident.status, func.count(Incident.id)
    ).group_by(Incident.status).all()
    
    # 2. Total by Department
    dept_counts = db.query(
        Department.name, func.count(Incident.id)
    ).join(Incident, Incident.department_id == Department.id).group_by(Department.name).all()
    
    # 3. Total by Priority
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
    department_id: UUID4
    category_id: UUID4

class IncidentCreate(IncidentBase):
    pass

class IncidentUpdate(BaseModel):
    status: Optional[IncidentStatus] = None
    priority: Optional[IncidentPriority] = None
    assignee_id: Optional[UUID4] = None

class IncidentInDB(IncidentBase):
    id: UUID4
    incident_key: str
    status: IncidentStatus
    reporter_id: UUID4
    assignee_id: Optional[UUID4]
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime]

    class Config:
        from_attributes = True

VALID_TRANSITIONS = {
    IncidentStatus.OPEN: [IncidentStatus.IN_PROGRESS, IncidentStatus.CANCELLED],
    IncidentStatus.IN_PROGRESS: [IncidentStatus.RESOLVED, IncidentStatus.OPEN, IncidentStatus.CANCELLED],
    IncidentStatus.RESOLVED: [IncidentStatus.CLOSED, IncidentStatus.IN_PROGRESS],
    IncidentStatus.CLOSED: [],
    IncidentStatus.CANCELLED: [IncidentStatus.OPEN]
}

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks

def send_status_notification(email: str, incident_key: str, new_status: str):
    # Conceptual email sending
    print(f"NOTIFICATION: Sending email to {email} - Incident {incident_key} is now {new_status}")

@router.post("/", response_model=IncidentInDB)
def create_incident(
    incident_in: IncidentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    # Generate incident key (e.g., INC-2026-001)
    # Simple implementation: INC-TIMESTAMP-RANDOM or just count
    count = db.query(Incident).count()
    incident_key = f"INC-{datetime.utcnow().year}-{count + 1:03d}"
    
    db_obj = Incident(
        **incident_in.dict(),
        incident_key=incident_key,
        reporter_id=current_user.id,
        status=IncidentStatus.OPEN
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

@router.get("/", response_model=List[IncidentInDB])
def read_incidents(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_active_user),
):
    query = db.query(Incident)
    
    if current_user.role == UserRole.REPORTER:
        query = query.filter(Incident.reporter_id == current_user.id)
    elif current_user.role == UserRole.STAFF:
        query = query.filter(Incident.department_id == current_user.department_id)
    # Managers and Admins see all for now, or we can scope Managers to their dept
    elif current_user.role == UserRole.MANAGER:
        query = query.filter(Incident.department_id == current_user.department_id)
        
    incidents = query.offset(skip).limit(limit).all()
    return incidents

@router.get("/{id}", response_model=IncidentInDB)
def read_incident(
    id: UUID4,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    incident = db.query(Incident).filter(Incident.id == id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    # Access check
    if current_user.role == UserRole.REPORTER and incident.reporter_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    return incident

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

    # 1. State Machine Validation
    if incident_update.status:
        if incident_update.status not in VALID_TRANSITIONS[incident.status]:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid transition from {incident.status} to {incident_update.status}"
            )
        
        # Role-based transition check
        if incident_update.status == IncidentStatus.RESOLVED and current_user.role not in [UserRole.STAFF, UserRole.MANAGER, UserRole.ADMIN]:
            raise HTTPException(status_code=403, detail="Only staff can resolve incidents")
        
        if incident_update.status == IncidentStatus.CLOSED and current_user.id != incident.reporter_id and current_user.role != UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="Only the reporter can close the incident")

        # Log transition
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
            # Notify reporter
            background_tasks.add_task(
                send_status_notification, 
                incident.reporter.email, 
                incident.incident_key, 
                incident_update.status
            )
        
        incident.status = incident_update.status

    # 2. Assignment Logic
    if incident_update.assignee_id:
        if current_user.role not in [UserRole.MANAGER, UserRole.ADMIN, UserRole.STAFF]:
             raise HTTPException(status_code=403, detail="Not authorized to assign")
        
        audit = AuditLog(
            incident_id=incident.id,
            actor_id=current_user.id,
            action="ASSIGNMENT",
            old_value=str(incident.assignee_id) if incident.assignee_id else None,
            new_value=str(incident_update.assignee_id)
        )
        db.add(audit)
        incident.assignee_id = incident_update.assignee_id
        if incident.status == IncidentStatus.OPEN:
            incident.status = IncidentStatus.IN_PROGRESS

    # 3. Priority Logic
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
    return incident
