from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from app.api import deps
from app.core.database import get_db
from app.models.models import Problem, Incident, User, UserRole, ChangeRequest, ProblemAction
from app.schemas.problem import (
    Problem as ProblemSchema, 
    ProblemCreate, 
    ProblemUpdate, 
    ChangeRequest as ChangeRequestSchema, 
    ChangeRequestCreate,
    ProblemAction as ProblemActionSchema,
    ProblemActionCreate,
    ProblemActionUpdate
)
from uuid import UUID
from datetime import datetime

router = APIRouter()

# --- Problem Actions (Global) ---

@router.get("/actions", response_model=List[ProblemActionSchema])
def list_all_actions(
    db: Session = Depends(get_db),
    assignee_id: Optional[UUID] = None,
    status: Optional[str] = None,
    current_user: User = Depends(deps.get_current_active_user),
):
    query = db.query(ProblemAction).options(joinedload(ProblemAction.assignee))
    
    # Staff/Admin see everything, Users only see their own
    if current_user.role == UserRole.REPORTER:
        query = query.filter(ProblemAction.assignee_id == current_user.id)
    elif assignee_id:
        query = query.filter(ProblemAction.assignee_id == assignee_id)
        
    if status:
        query = query.filter(ProblemAction.status == status)
        
    actions = query.order_by(ProblemAction.due_date.asc()).all()
    for a in actions:
        a.assignee_name = a.assignee.full_name or a.assignee.email if a.assignee else "Unknown"
    return actions

# --- Problems ---

@router.get("/", response_model=List[ProblemSchema])
def list_problems(
    db: Session = Depends(get_db),
    status: Optional[str] = None,
    current_user: User = Depends(deps.get_current_active_user),
):
    query = db.query(Problem).options(
        joinedload(Problem.change_requests),
        joinedload(Problem.actions).joinedload(ProblemAction.assignee)
    )
    if status:
        query = query.filter(Problem.status == status)
    
    problems = query.all()
    for p in problems:
        for a in p.actions:
            a.assignee_name = a.assignee.full_name or a.assignee.email if a.assignee else "Unknown"
    return problems

@router.post("/", response_model=ProblemSchema)
def create_problem(
    problem_in: ProblemCreate,
    incident_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    if current_user.role not in [UserRole.STAFF, UserRole.MANAGER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    problem = Problem(**problem_in.dict(), creator_id=current_user.id)
    db.add(problem)
    db.commit()
    db.refresh(problem)

    if incident_id:
        incident = db.query(Incident).filter(Incident.id == incident_id).first()
        if incident:
            incident.problem_id = problem.id
            db.commit()

    return problem

@router.get("/{id}", response_model=ProblemSchema)
def get_problem(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    problem = db.query(Problem).options(
        joinedload(Problem.change_requests),
        joinedload(Problem.incidents),
        joinedload(Problem.actions).joinedload(ProblemAction.assignee)
    ).filter(Problem.id == id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    for a in problem.actions:
        a.assignee_name = a.assignee.full_name or a.assignee.email if a.assignee else "Unknown"
        
    return problem

@router.patch("/{id}", response_model=ProblemSchema)
def update_problem(
    id: UUID,
    problem_in: ProblemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    problem = db.query(Problem).filter(Problem.id == id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")

    # Access Control
    is_admin = current_user.role == UserRole.ADMIN
    is_staff = current_user.role in [UserRole.STAFF, UserRole.MANAGER, UserRole.ADMIN]
    is_creator = problem.creator_id == current_user.id

    if not is_staff and not is_creator:
        raise HTTPException(status_code=403, detail="Not authorized")

    update_data = problem_in.dict(exclude_unset=True)
    
    # Manual Status Override (Admin Only)
    if "status" in update_data:
        new_status = update_data["status"]
        if new_status == "CANCELLED":
            if not (is_creator and problem.status == "OPEN") and not is_admin:
                raise HTTPException(status_code=400, detail="Only creator can cancel an OPEN problem, or Admin can override.")
        elif not is_admin:
            # If not admin, status is calculated automatically
            del update_data["status"]

    for field, value in update_data.items():
        setattr(problem, field, value)
    
    # --- AUTOMATIC STATUS TRANSITIONS ---
    if problem.status != "CANCELLED":
        # OPEN -> DEFINITION (Function Failure and Mode filled)
        if problem.status == "OPEN" and problem.function_failure and problem.failure_mode:
            problem.status = "DEFINITION"
        
        # DEFINITION -> ANALYSIS (5 Whys or Situational filled)
        if problem.status == "DEFINITION" and (problem.five_whys or problem.rcfa_analysis):
            problem.status = "ANALYSIS"
            
        # ANALYSIS -> COUNTERMEASURE (Root Cause & Countermeasure defined)
        if problem.status == "ANALYSIS" and problem.root_cause and problem.countermeasure:
            problem.status = "COUNTERMEASURE"
            
        # COUNTERMEASURE -> MONITORING (Actions assigned and at least one in progress)
        if problem.status == "COUNTERMEASURE" and len(problem.actions) > 0:
            problem.status = "MONITORING"
            
        # MONITORING -> CLOSED (All actions completed)
        if problem.status == "MONITORING" and len(problem.actions) > 0:
            all_completed = all(a.status == "COMPLETED" for a in problem.actions)
            if all_completed:
                problem.status = "CLOSED"
                problem.resolved_at = datetime.utcnow()

    db.commit()
    db.refresh(problem)
    return problem

@router.post("/{id}/actions", response_model=ProblemActionSchema)
def create_problem_action(
    id: UUID,
    action_in: ProblemActionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    if current_user.role not in [UserRole.STAFF, UserRole.MANAGER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    problem = db.query(Problem).filter(Problem.id == id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    action = ProblemAction(**action_in.dict(), problem_id=id)
    db.add(action)
    db.commit()
    
    # Auto-trigger status update for problem (transition to MONITORING)
    if problem.status == "COUNTERMEASURE":
        problem.status = "MONITORING"
        db.commit()

    db.refresh(action)
    action = db.query(ProblemAction).options(joinedload(ProblemAction.assignee)).filter(ProblemAction.id == action.id).first()
    action.assignee_name = action.assignee.full_name or action.assignee.email if action.assignee else "Unknown"
    
    return action

@router.patch("/{id}/actions/{action_id}", response_model=ProblemActionSchema)
def update_problem_action(
    id: UUID,
    action_id: UUID,
    action_in: ProblemActionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    action = db.query(ProblemAction).filter(ProblemAction.id == action_id, ProblemAction.problem_id == id).first()
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")
    
    update_data = action_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(action, field, value)
    
    db.commit()
    
    # Auto-trigger status update for problem (check if all completed -> CLOSED)
    problem = db.query(Problem).filter(Problem.id == id).first()
    if problem.status == "MONITORING":
        all_completed = all(a.status == "COMPLETED" for a in problem.actions)
        if all_completed:
            problem.status = "CLOSED"
            problem.resolved_at = datetime.utcnow()
            db.commit()

    db.refresh(action)
    action = db.query(ProblemAction).options(joinedload(ProblemAction.assignee)).filter(ProblemAction.id == action.id).first()
    action.assignee_name = action.assignee.full_name or action.assignee.email if action.assignee else "Unknown"
    
    return action

@router.post("/{id}/incidents/{incident_id}")
def link_incident_to_problem(
    id: UUID,
    incident_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    if current_user.role not in [UserRole.STAFF, UserRole.MANAGER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    problem = db.query(Problem).filter(Problem.id == id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
        
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    incident.problem_id = id
    db.commit()
    
    return {"message": "Incident linked to problem"}

@router.post("/{id}/changes", response_model=ChangeRequestSchema)
def create_change_request(
    id: UUID,
    change_in: ChangeRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    if current_user.role not in [UserRole.STAFF, UserRole.MANAGER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    problem = db.query(Problem).filter(Problem.id == id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
        
    change = ChangeRequest(
        **change_in.dict(exclude={"problem_id"}),
        problem_id=id,
        requester_id=current_user.id
    )
    db.add(change)
    db.commit()
    db.refresh(change)
    return change
