from fastapi import APIRouter
from app.api.v1.endpoints import auth, departments, incidents, comments

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(departments.router, prefix="/departments", tags=["departments"])
api_router.include_router(incidents.router, prefix="/incidents", tags=["incidents"])
api_router.include_router(comments.router, prefix="/incidents", tags=["comments"])
