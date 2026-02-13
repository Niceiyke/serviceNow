from pydantic import BaseModel, UUID4
from datetime import datetime
from typing import Optional

class AuditLogBase(BaseModel):
    action: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None

class AuditLog(AuditLogBase):
    id: UUID4
    incident_id: UUID4
    actor_id: UUID4
    actor_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
