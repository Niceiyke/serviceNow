from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api import deps
from app.core.database import get_db
from app.models.models import Department, UserRole
from pydantic import BaseModel, UUID4

router = APIRouter()

class DepartmentBase(BaseModel):
    name: str
    description: Optional[str] = None

class DepartmentInDB(DepartmentBase):
    id: UUID4
    
    class Config:
        from_attributes = True

@router.get("/", response_model=List[DepartmentInDB])
def read_departments(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user = Depends(deps.get_current_active_user),
):
    departments = db.query(Department).offset(skip).limit(limit).all()
    return departments

@router.post("/", response_model=DepartmentInDB)
def create_department(
    department_in: DepartmentBase,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_active_user),
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    db_obj = Department(name=department_in.name, description=department_in.description)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj
