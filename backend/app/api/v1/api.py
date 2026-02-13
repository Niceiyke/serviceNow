from fastapi import APIRouter
from app.api.v1.endpoints import auth, departments, incidents, comments, users, categories

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(departments.router, prefix="/departments", tags=["departments"])
api_router.include_router(categories.router, prefix="/categories", tags=["categories"])
api_router.include_router(incidents.router, prefix="/incidents", tags=["incidents"])
api_router.include_router(comments.router, prefix="/incidents", tags=["comments"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
