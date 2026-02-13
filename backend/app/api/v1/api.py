from fastapi import APIRouter
from app.api.v1.endpoints import auth, departments, incidents, comments, users, categories, websockets, attachments, problems, service_catalog

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(departments.router, prefix="/departments", tags=["departments"])
api_router.include_router(categories.router, prefix="/categories", tags=["categories"])
api_router.include_router(incidents.router, prefix="/incidents", tags=["incidents"])
api_router.include_router(comments.router, prefix="/incidents", tags=["comments"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(websockets.router, tags=["websockets"])
api_router.include_router(attachments.router, prefix="/incidents", tags=["attachments"])
api_router.include_router(problems.router, prefix="/problems", tags=["problems"])
api_router.include_router(service_catalog.router, prefix="/catalog", tags=["catalog"])
