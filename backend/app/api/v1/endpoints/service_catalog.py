from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api import deps
from app.core.database import get_db
from app.models.models import ServiceItem, Category, User, UserRole, Incident, IncidentStatus, AuditLog, IncidentPriority
from app.schemas.service_item import ServiceItem as ServiceItemSchema, ServiceItemCreate
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel

router = APIRouter()

@router.get("/", response_model=List[ServiceItemSchema])
def list_service_items(
    db: Session = Depends(get_db),
    category_id: Optional[UUID] = None,
    current_user: User = Depends(deps.get_current_active_user),
):
    query = db.query(ServiceItem).filter(ServiceItem.is_active == True)
    if category_id:
        query = query.filter(ServiceItem.category_id == category_id)
    return query.all()

@router.post("/", response_model=ServiceItemSchema)
def create_service_item(
    item_in: ServiceItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    item = ServiceItem(**item_in.dict())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

class ServiceRequest(BaseModel):
    description: Optional[str] = None

@router.post("/{id}/request", status_code=status.HTTP_201_CREATED)
def request_service_item(
    id: UUID,
    request_in: ServiceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    service_item = db.query(ServiceItem).filter(ServiceItem.id == id).first()
    if not service_item:
        raise HTTPException(status_code=404, detail="Service item not found")

    count = db.query(Incident).count()
    incident_key = f"REQ-{datetime.utcnow().year}-{count + 1:03d}"
    
    incident = Incident(
        incident_key=incident_key,
        title=f"Request: {service_item.name}",
        description=request_in.description or service_item.description,
        status=IncidentStatus.OPEN,
        priority=service_item.base_priority,
        reporter_id=current_user.id,
        category_id=service_item.category_id,
        department_id=current_user.department_id, # Or service item department if defined
        service_item_id=service_item.id
    )
    db.add(incident)
    db.commit()
    db.refresh(incident)
    
    return {"id": incident.id, "key": incident_key, "message": "Service request submitted"}
