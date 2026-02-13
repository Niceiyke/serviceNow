from typing import Optional
from uuid import UUID
from pydantic import BaseModel
from app.models.models import IncidentPriority

class SLAPolicyBase(BaseModel):
    name: str
    priority: IncidentPriority
    response_time_minutes: int
    resolution_time_minutes: int

class SLAPolicyCreate(SLAPolicyBase):
    pass

class SLAPolicyUpdate(BaseModel):
    name: Optional[str] = None
    priority: Optional[IncidentPriority] = None
    response_time_minutes: Optional[int] = None
    resolution_time_minutes: Optional[int] = None

class SLAPolicy(SLAPolicyBase):
    id: UUID

    class Config:
        from_attributes = True
