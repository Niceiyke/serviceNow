from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Query
from sqlalchemy.orm import Session, joinedload
from app.api import deps
from app.core.database import get_db
from app.models.models import Incident, IncidentStatus, IncidentPriority, User, UserRole, AuditLog, Department, Category, Subcategory, Comment, SLAPolicy
from pydantic import BaseModel, UUID4
from datetime import datetime, timedelta
from app.schemas.audit import AuditLog as AuditLogSchema
from sqlalchemy import func
from app.services.notifications import NotificationService
from app.core.websockets import manager
import logging

logger = logging.getLogger(__name__)

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
        
        # Try to resolve old/new values if they are UUIDs (for existing logs)
        if log.action == "ASSIGNMENT":
            import uuid
            for field in ["old_value", "new_value"]:
                val = getattr(log, field)
                if val and val != "Unassigned":
                    try:
                        # Check if it's a valid UUID
                        uuid_val = uuid.UUID(val)
                        user = db.query(User).filter(User.id == uuid_val).first()
                        if user:
                            setattr(log_data, field, user.full_name or user.email)
                    except (ValueError, TypeError):
                        pass # Already a name or something else
        
        results.append(log_data)
        
    return results

@router.get("/stats")
def get_incident_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    if current_user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Base queries
    status_query = db.query(Incident.status, func.count(Incident.id))
    dept_query = db.query(Department.name, func.count(Incident.id)).join(Incident, Incident.department_id == Department.id)
    priority_query = db.query(Incident.priority, func.count(Incident.id))
    mttr_query = db.query(Incident).filter(Incident.resolved_at != None)
    
    # Apply department filter if Manager
    if current_user.role == UserRole.MANAGER:
        status_query = status_query.filter(Incident.department_id == current_user.department_id)
        dept_query = dept_query.filter(Incident.department_id == current_user.department_id)
        priority_query = priority_query.filter(Incident.department_id == current_user.department_id)
        mttr_query = mttr_query.filter(Incident.department_id == current_user.department_id)

    status_counts = status_query.group_by(Incident.status).all()
    dept_counts = dept_query.group_by(Department.name).all()
    priority_counts = priority_query.group_by(Incident.priority).all()

    # MTTR Calculation
    resolved_incidents = mttr_query.all()
    
    mttr_total = 0
    mttr_count = len(resolved_incidents)
    mttr_by_priority = {}

    for inc in resolved_incidents:
        duration = (inc.resolved_at - inc.created_at).total_seconds() / 3600 # hours
        mttr_total += duration
        
        p = inc.priority
        if p not in mttr_by_priority:
            mttr_by_priority[p] = {"total": 0, "count": 0}
        mttr_by_priority[p]["total"] += duration
        mttr_by_priority[p]["count"] += 1

    avg_mttr = mttr_total / mttr_count if mttr_count > 0 else 0
    
    # 30-Day MTTR Trend
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    trend_query = db.query(Incident).filter(Incident.resolved_at >= thirty_days_ago)
    
    if current_user.role == UserRole.MANAGER:
        trend_query = trend_query.filter(Incident.department_id == current_user.department_id)
        
    trend_incidents = trend_query.all()

    daily_mttr = {}
    for inc in trend_incidents:
        date_str = str(inc.resolved_at.date())
        duration = (inc.resolved_at - inc.created_at).total_seconds() / 3600
        
        if date_str not in daily_mttr:
            daily_mttr[date_str] = {"total": 0, "count": 0}
        
        daily_mttr[date_str]["total"] += duration
        daily_mttr[date_str]["count"] += 1

    resolution_trend = [
        {"date": d, "mttr": round(data["total"] / data["count"], 2)} 
        for d, data in sorted(daily_mttr.items())
    ]

    # Additional Manager specific stats: Team Workload
    team_workload = []
    if current_user.role == UserRole.MANAGER:
        team_members = db.query(User).filter(User.department_id == current_user.department_id).all()
        for member in team_members:
            open_count = db.query(func.count(Incident.id)).filter(
                Incident.assignee_id == member.id,
                Incident.status.in_([IncidentStatus.OPEN, IncidentStatus.IN_PROGRESS])
            ).scalar()
            team_workload.append({
                "name": member.full_name or member.email,
                "value": open_count
            })

    mttr_stats = {
        "overall": round(avg_mttr, 2),
        "by_priority": {str(p): round(data["total"] / data["count"], 2) for p, data in mttr_by_priority.items()}
    }

    return {
        "by_status": {s: c for s, c in status_counts},
        "by_department": {d: c for d, c in dept_counts},
        "by_priority": {p: d for p, d in priority_counts},
        "mttr": mttr_stats,
        "trend": resolution_trend,
        "team_workload": team_workload
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
    status_comment: Optional[str] = None

class IncidentInDB(IncidentBase):
    id: UUID4
    incident_key: str
    status: IncidentStatus
    reporter_id: UUID4
    assignee_id: Optional[UUID4]
    problem_id: Optional[UUID4] = None
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime]
    sla_breach_at: Optional[datetime] = None
    
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
    IncidentStatus.CANCELLED: []
}

@router.post("/", response_model=IncidentInDB)
def create_incident(
    incident_in: IncidentCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    count = db.query(Incident).count()
    incident_key = f"INC-{datetime.utcnow().year}-{count + 1:03d}"
    
    # Use reporter's department if not provided
    dept_id = incident_in.department_id or current_user.department_id

    # Calculate SLA
    sla_breach_at = None
    policy = db.query(SLAPolicy).filter(SLAPolicy.priority == incident_in.priority).first()
    if policy:
        sla_breach_at = datetime.utcnow() + timedelta(minutes=policy.resolution_time_minutes)

    db_obj = Incident(
        **incident_in.dict(exclude={"department_id"}),
        incident_key=incident_key,
        reporter_id=current_user.id,
        department_id=dept_id,
        status=IncidentStatus.OPEN,
        sla_breach_at=sla_breach_at
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

    background_tasks.add_task(NotificationService.send_incident_creation_notification, db_obj, current_user)
    logger.info(f"Triggering broadcast for new incident: {db_obj.incident_key}")
    background_tasks.add_task(manager.broadcast, {"type": "INCIDENT_CREATED", "id": str(db_obj.id)})
    
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
    status: Optional[List[IncidentStatus]] = Query(None),
    priority: Optional[List[IncidentPriority]] = Query(None),
    reporter_id: Optional[UUID4] = None,
    assignee_id: Optional[UUID4] = None,
    department_id: Optional[UUID4] = None,
    category_id: Optional[UUID4] = None,
    search: Optional[str] = None,
    created_at_from: Optional[datetime] = None,
    created_at_to: Optional[datetime] = None,
    current_user: User = Depends(deps.get_current_active_user),
):
    query = db.query(Incident).options(
        joinedload(Incident.reporter),
        joinedload(Incident.department),
        joinedload(Incident.category),
        joinedload(Incident.subcategory),
        joinedload(Incident.assignee)
    )
    
    # Role-based filtering
    if current_user.role == UserRole.REPORTER:
        query = query.filter(Incident.reporter_id == current_user.id)
    elif current_user.role == UserRole.STAFF or current_user.role == UserRole.MANAGER:
        # Staff and Managers only see incidents from their own department
        query = query.filter(Incident.department_id == current_user.department_id)
    
    # Dynamic filtering
    if status:
        query = query.filter(Incident.status.in_(status))
    if priority:
        query = query.filter(Incident.priority.in_(priority))
    if reporter_id:
        query = query.filter(Incident.reporter_id == reporter_id)
    if assignee_id:
        query = query.filter(Incident.assignee_id == assignee_id)
    if department_id:
        query = query.filter(Incident.department_id == department_id)
    if category_id:
        query = query.filter(Incident.category_id == category_id)
        
    if search:
        # Basic full-text search across multiple columns
        search_filter = (
            (Incident.title.ilike(f"%{search}%")) | 
            (Incident.incident_key.ilike(f"%{search}%")) |
            (Incident.description.ilike(f"%{search}%"))
        )
        query = query.filter(search_filter)
        
    if created_at_from:
        query = query.filter(Incident.created_at >= created_at_from)
    if created_at_to:
        query = query.filter(Incident.created_at <= created_at_to)
        
    incidents = query.order_by(Incident.created_at.desc()).offset(skip).limit(limit).all()
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
                detail=f"Invalid transition from {incident.status} to {incident_update.status}. Cancelled or Closed incidents cannot be reopened."
            )
        
        if incident_update.status in [IncidentStatus.RESOLVED, IncidentStatus.CLOSED, IncidentStatus.CANCELLED]:
            if incident_update.status in [IncidentStatus.CLOSED, IncidentStatus.CANCELLED]:
                if not incident_update.status_comment:
                    raise HTTPException(status_code=400, detail=f"A comment is required to {incident_update.status.lower()} the incident")
                
                # Add the reason as a comment
                reason_comment = Comment(
                    content=f"Incident {incident_update.status.lower()} by {current_user.full_name or current_user.email}. Reason: {incident_update.status_comment}",
                    incident_id=incident.id,
                    author_id=current_user.id,
                    is_internal=False
                )
                db.add(reason_comment)

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
        
        background_tasks.add_task(
            NotificationService.send_status_change_notification, 
            incident, 
            incident.status, 
            incident_update.status
        )
        
        if incident_update.status == IncidentStatus.RESOLVED:
            incident.resolved_at = datetime.utcnow()
        
        incident.status = incident_update.status

    # 3. Assignment Logic
    update_data = incident_update.dict(exclude_unset=True)
    if "assignee_id" in update_data:
        if current_user.role not in [UserRole.MANAGER, UserRole.ADMIN, UserRole.STAFF]:
             raise HTTPException(status_code=403, detail="Not authorized to assign")
        
        if incident.status in [IncidentStatus.CLOSED, IncidentStatus.CANCELLED]:
            raise HTTPException(status_code=400, detail=f"Cannot assign user to a {incident.status.lower()} incident")
        
        assignee_id = update_data["assignee_id"]
        
        # Fetch names for better logging
        old_assignee = db.query(User).filter(User.id == incident.assignee_id).first() if incident.assignee_id else None
        new_assignee = db.query(User).filter(User.id == assignee_id).first() if assignee_id else None
        
        audit = AuditLog(
            incident_id=incident.id,
            actor_id=current_user.id,
            action="ASSIGNMENT",
            old_value=old_assignee.full_name or old_assignee.email if old_assignee else "Unassigned",
            new_value=new_assignee.full_name or new_assignee.email if new_assignee else "Unassigned"
        )
        db.add(audit)
        incident.assignee_id = assignee_id
        
        if new_assignee:
            background_tasks.add_task(NotificationService.send_assignment_notification, incident, new_assignee)
            
        if assignee_id and incident.status == IncidentStatus.OPEN:
            incident.status = IncidentStatus.IN_PROGRESS

    # 4. Priority Logic
    if incident_update.priority:
        if current_user.role not in [UserRole.MANAGER, UserRole.ADMIN, UserRole.STAFF]:
             raise HTTPException(status_code=403, detail="Not authorized to change priority")
        
        if incident.status in [IncidentStatus.CLOSED, IncidentStatus.CANCELLED]:
            raise HTTPException(status_code=400, detail=f"Cannot update priority of a {incident.status.lower()} incident")
        
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

    logger.info(f"Triggering broadcast for incident update: {incident.incident_key}")
    background_tasks.add_task(manager.broadcast, {"type": "INCIDENT_UPDATED", "id": str(incident.id)})
    
    incident = db.query(Incident).options(
        joinedload(Incident.reporter),
        joinedload(Incident.department),
        joinedload(Incident.category),
        joinedload(Incident.subcategory),
        joinedload(Incident.assignee)
    ).filter(Incident.id == id).first()
    return IncidentInDB.from_orm_custom(incident)
