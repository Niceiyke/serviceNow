from typing import Optional
from uuid import UUID
from pydantic import BaseModel
from app.models.models import IncidentPriority

class ServiceItemBase(BaseModel):
    name: str
    description: Optional[str] = None
    icon: Optional[str] = "box"
    base_priority: Optional[IncidentPriority] = IncidentPriority.MEDIUM
    category_id: UUID
    is_active: Optional[bool] = True

class ServiceItemCreate(ServiceItemBase):
    pass

class ServiceItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    base_priority: Optional[IncidentPriority] = None
    category_id: Optional[UUID] = None
    is_active: Optional[bool] = None

class ServiceItem(ServiceItemBase):
    id: UUID

    class Config:
        from_attributes = True
