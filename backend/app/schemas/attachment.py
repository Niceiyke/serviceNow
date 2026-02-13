from pydantic import BaseModel, UUID4
from datetime import datetime
from typing import Optional

class AttachmentBase(BaseModel):
    file_name: str
    content_type: str
    file_size: Optional[str] = None

class AttachmentCreate(AttachmentBase):
    incident_id: UUID4
    file_path: str

class AttachmentInDB(AttachmentBase):
    id: UUID4
    incident_id: UUID4
    uploader_id: UUID4
    created_at: datetime
    uploader_name: Optional[str] = None

    class Config:
        from_attributes = True
