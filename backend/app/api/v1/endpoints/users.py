from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api import deps
from app.core.database import get_db
from app.models.models import User, UserRole, Department
from app.schemas.user import UserInDB, UserUpdate, UserCreate
from app.core import security
from pydantic import UUID4

router = APIRouter()

@router.post("/", response_model=UserInDB)
def create_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    user = db.query(User).filter(User.email == user_in.email).first()
    if user:
        raise HTTPException(status_code=400, detail="User already exists")
    
    db_obj = User(
        email=user_in.email,
        hashed_password=security.get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role=user_in.role,
        department_id=user_in.department_id,
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

@router.get("/", response_model=List[UserInDB])
def read_users(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_active_user),
):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    users = db.query(User).offset(skip).limit(limit).all()
    return users

@router.patch("/me", response_model=UserInDB)
def update_user_me(
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    if user_update.department_id:
        dept = db.query(Department).filter(Department.id == user_update.department_id).first()
        if not dept:
            raise HTTPException(status_code=404, detail="Department not found")
        current_user.department_id = user_update.department_id
    
    if user_update.full_name:
        current_user.full_name = user_update.full_name
    
    if user_update.password:
        current_user.hashed_password = security.get_password_hash(user_update.password)

    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user

@router.patch("/{id}", response_model=UserInDB)
def update_user_role_dept(
    id: UUID4,
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user_update.role:
        user.role = user_update.role
    
    if user_update.department_id:
        # Verify department exists
        dept = db.query(Department).filter(Department.id == user_update.department_id).first()
        if not dept:
            raise HTTPException(status_code=404, detail="Department not found")
        user.department_id = user_update.department_id
    
    if user_update.full_name:
        user.full_name = user_update.full_name

    db.commit()
    db.refresh(user)
    return user
