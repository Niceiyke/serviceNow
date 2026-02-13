from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.models import SLAPolicy, IncidentPriority, Category, ServiceItem, Department
import uuid

def seed():
    db = SessionLocal()
    try:
        # 1. Seed SLA Policies
        sla_policies = [
            {"name": "Critical Response", "priority": IncidentPriority.CRITICAL, "response_time_minutes": 15, "resolution_time_minutes": 240},
            {"name": "High Priority", "priority": IncidentPriority.HIGH, "response_time_minutes": 60, "resolution_time_minutes": 480},
            {"name": "Standard Priority", "priority": IncidentPriority.MEDIUM, "response_time_minutes": 240, "resolution_time_minutes": 1440},
            {"name": "Low Priority", "priority": IncidentPriority.LOW, "response_time_minutes": 480, "resolution_time_minutes": 2880},
        ]
        
        for p in sla_policies:
            existing = db.query(SLAPolicy).filter(SLAPolicy.priority == p["priority"]).first()
            if not existing:
                db.add(SLAPolicy(**p))

        # 2. Get or Create a Category
        cat = db.query(Category).first()
        if not cat:
            cat = Category(name="IT Services", description="General IT support")
            db.add(cat)
            db.flush()

        # 3. Seed Service Items
        service_items = [
            {"name": "Request New Laptop", "description": "Request a standard developer or business laptop.", "icon": "box", "base_priority": IncidentPriority.LOW, "category_id": cat.id},
            {"name": "VPN Access Request", "description": "Request access to the corporate VPN.", "icon": "zap", "base_priority": IncidentPriority.MEDIUM, "category_id": cat.id},
            {"name": "Software Installation", "description": "Request a software package to be installed on your workstation.", "icon": "server", "base_priority": IncidentPriority.MEDIUM, "category_id": cat.id},
            {"name": "Security Badge Reset", "description": "Reset your physical security badge access.", "icon": "shield", "base_priority": IncidentPriority.HIGH, "category_id": cat.id},
        ]

        for item in service_items:
            existing = db.query(ServiceItem).filter(ServiceItem.name == item["name"]).first()
            if not existing:
                db.add(ServiceItem(**item))

        db.commit()
        print("Seed data created successfully.")
    except Exception as e:
        print(f"Error seeding data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed()
