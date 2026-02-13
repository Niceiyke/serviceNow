from typing import List, Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel

class ProblemBase(BaseModel):
    title: str
    description: Optional[str] = None
    root_cause: Optional[str] = None
    rcfa_analysis: Optional[str] = None
    five_whys: Optional[str] = None
    countermeasure: Optional[str] = None
    function_failure: Optional[str] = None
    failure_mode: Optional[str] = None
    status: Optional[str] = "OPEN"

class ProblemCreate(ProblemBase):
    pass

class ProblemUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    root_cause: Optional[str] = None
    rcfa_analysis: Optional[str] = None
    five_whys: Optional[str] = None
    countermeasure: Optional[str] = None
    function_failure: Optional[str] = None
    failure_mode: Optional[str] = None
    status: Optional[str] = None

class ProblemActionBase(BaseModel):
    description: str
    assignee_id: UUID
    due_date: Optional[datetime] = None
    status: Optional[str] = "PENDING"

class ProblemActionCreate(ProblemActionBase):
    pass

class ProblemActionUpdate(BaseModel):
    description: Optional[str] = None
    assignee_id: Optional[UUID] = None
    due_date: Optional[datetime] = None
    status: Optional[str] = None

class ProblemAction(ProblemActionBase):
    id: UUID
    problem_id: UUID
    created_at: datetime
    assignee_name: Optional[str] = None

    class Config:
        from_attributes = True

class ChangeRequestBase(BaseModel):
    title: str
    description: Optional[str] = None
    risk_level: Optional[str] = "LOW"
    status: Optional[str] = "DRAFT"
    problem_id: Optional[UUID] = None
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None

class ChangeRequestCreate(ChangeRequestBase):
    pass

class ChangeRequestUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    risk_level: Optional[str] = None
    status: Optional[str] = None
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None

class ChangeRequest(ChangeRequestBase):
    id: UUID
    requester_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True

class IncidentSummary(BaseModel):
    id: UUID
    incident_key: str
    title: str
    status: str

    class Config:
        from_attributes = True

class Problem(ProblemBase):
    id: UUID
    creator_id: Optional[UUID] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None
    change_requests: List[ChangeRequest] = []
    incidents: List[IncidentSummary] = []
    actions: List[ProblemAction] = []

    class Config:
        from_attributes = True
