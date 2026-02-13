import enum
import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import Column, String, Boolean, Enum, ForeignKey, DateTime, Text, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base

class UserRole(str, enum.Enum):
    REPORTER = "REPORTER"
    STAFF = "STAFF"
    MANAGER = "MANAGER"
    ADMIN = "ADMIN"

class IncidentStatus(str, enum.Enum):
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"
    CANCELLED = "CANCELLED"

class IncidentPriority(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    role = Column(Enum(UserRole), default=UserRole.REPORTER)
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    department = relationship("Department", back_populates="users")
    reported_incidents = relationship("Incident", back_populates="reporter", foreign_keys="Incident.reporter_id")
    assigned_incidents = relationship("Incident", back_populates="assignee", foreign_keys="Incident.assignee_id")

class Department(Base):
    __tablename__ = "departments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, unique=True, index=True, nullable=False)
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    users = relationship("User", back_populates="department")
    incidents = relationship("Incident", back_populates="department")

class Category(Base):
    __tablename__ = "categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    description = Column(Text)
    is_active = Column(Boolean, default=True)

    subcategories = relationship("Subcategory", back_populates="category")
    incidents = relationship("Incident", back_populates="category")

class Subcategory(Base):
    __tablename__ = "subcategories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=False)
    description = Column(Text)
    is_active = Column(Boolean, default=True)

    category = relationship("Category", back_populates="subcategories")
    incidents = relationship("Incident", back_populates="subcategory")

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    incident_key = Column(String, unique=True, index=True, nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text)
    status = Column(Enum(IncidentStatus), default=IncidentStatus.OPEN)
    priority = Column(Enum(IncidentPriority), default=IncidentPriority.MEDIUM)
    
    reporter_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id"), nullable=True)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=False)
    subcategory_id = Column(UUID(as_uuid=True), ForeignKey("subcategories.id"), nullable=True)
    assignee_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

    reporter = relationship("User", foreign_keys=[reporter_id], back_populates="reported_incidents")
    department = relationship("Department", back_populates="incidents")
    category = relationship("Category", back_populates="incidents")
    subcategory = relationship("Subcategory", back_populates="incidents")
    assignee = relationship("User", foreign_keys=[assignee_id], back_populates="assigned_incidents")
    comments = relationship("Comment", back_populates="incident")
    audit_logs = relationship("AuditLog", back_populates="incident")
    attachments = relationship("Attachment", back_populates="incident")

    problem_id = Column(UUID(as_uuid=True), ForeignKey("problems.id"), nullable=True)
    problem = relationship("Problem", back_populates="incidents")

    service_item_id = Column(UUID(as_uuid=True), ForeignKey("service_items.id"), nullable=True)
    service_item = relationship("ServiceItem", back_populates="incidents")

    sla_breach_at = Column(DateTime, nullable=True)


class Problem(Base):
    __tablename__ = "problems"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String, nullable=False)
    description = Column(Text)
    root_cause = Column(Text)
    rcfa_analysis = Column(Text)  # Professional Root Cause Failure Analysis
    five_whys = Column(Text)     # 5 Whys Analysis stored as JSON or formatted text
    countermeasure = Column(Text) # Corrective action to prevent recurrence
    function_failure = Column(Text) # The loss of function
    failure_mode = Column(Text)     # How the failure manifests
    status = Column(String, default="OPEN")  # OPEN, DEFINITION, ANALYSIS, COUNTERMEASURE, MONITORING, CLOSED, CANCELLED
    
    creator_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

    creator = relationship("User", foreign_keys=[creator_id])
    incidents = relationship("Incident", back_populates="problem")
    change_requests = relationship("ChangeRequest", back_populates="problem")
    actions = relationship("ProblemAction", back_populates="problem")


class ProblemAction(Base):
    __tablename__ = "problem_actions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    problem_id = Column(UUID(as_uuid=True), ForeignKey("problems.id"), nullable=False)
    description = Column(Text, nullable=False)
    assignee_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    due_date = Column(DateTime, nullable=True)
    status = Column(String, default="PENDING") # PENDING, IN_PROGRESS, COMPLETED, CANCELLED
    created_at = Column(DateTime, default=datetime.utcnow)

    problem = relationship("Problem", back_populates="actions")
    assignee = relationship("User")


class ChangeRequest(Base):
    __tablename__ = "change_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String, nullable=False)
    description = Column(Text)
    risk_level = Column(String, default="LOW")  # LOW, MEDIUM, HIGH, CRITICAL
    status = Column(String, default="DRAFT")  # DRAFT, SUBMITTED, APPROVED, IMPLEMENTED, REVIEWED, CLOSED
    
    problem_id = Column(UUID(as_uuid=True), ForeignKey("problems.id"), nullable=True)
    requester_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    scheduled_start = Column(DateTime, nullable=True)
    scheduled_end = Column(DateTime, nullable=True)

    problem = relationship("Problem", back_populates="change_requests")
    requester = relationship("User")


class ServiceItem(Base):
    __tablename__ = "service_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    description = Column(Text)
    icon = Column(String, default="box")  # frontend icon name
    base_priority = Column(Enum(IncidentPriority), default=IncidentPriority.MEDIUM)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=False)
    
    is_active = Column(Boolean, default=True)
    
    incidents = relationship("Incident", back_populates="service_item")
    category = relationship("Category")


class SLAPolicy(Base):
    __tablename__ = "sla_policies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    priority = Column(Enum(IncidentPriority), unique=True, nullable=False)
    response_time_minutes = Column(Integer, default=60)
    resolution_time_minutes = Column(Integer, default=1440)  # 24 hours


class Comment(Base):
    __tablename__ = "comments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    incident_id = Column(UUID(as_uuid=True), ForeignKey("incidents.id"), nullable=False)
    author_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    is_internal = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    incident = relationship("Incident", back_populates="comments")
    author = relationship("User", foreign_keys=[author_id])

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    incident_id = Column(UUID(as_uuid=True), ForeignKey("incidents.id"), nullable=False)
    actor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    action = Column(String, nullable=False)
    old_value = Column(String, nullable=True)
    new_value = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    incident = relationship("Incident", back_populates="audit_logs")

class Attachment(Base):
    __tablename__ = "attachments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    incident_id = Column(UUID(as_uuid=True), ForeignKey("incidents.id"), nullable=False)
    uploader_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    file_name = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    content_type = Column(String, nullable=False)
    file_size = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    incident = relationship("Incident", back_populates="attachments")
    uploader = relationship("User")
