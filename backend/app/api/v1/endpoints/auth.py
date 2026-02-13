from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.core import security
from app.core.database import get_db
from app.models.models import User
from app.schemas.user import UserCreate, UserInDB, Token
from datetime import timedelta
from app.services.notifications import NotificationService

from app.api import deps

router = APIRouter()

@router.post("/register", response_model=UserInDB)
def register(
    user_in: UserCreate, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == user_in.email).first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this username already exists in the system.",
        )
    
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
    
    background_tasks.add_task(NotificationService.send_welcome_email, db_obj)
    
    return db_obj

@router.post("/login", response_model=Token)
def login(db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    elif not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    
    access_token_expires = timedelta(minutes=30)
    return {
        "access_token": security.create_access_token(
            user.id, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }

@router.get("/me", response_model=UserInDB)
def get_me(current_user: User = Depends(deps.get_current_active_user)):
    return current_user
