import pytest
from app.models.models import IncidentStatus, IncidentPriority

def test_create_incident(client, auth_header, db):
    from app.models.models import Category
    # Setup: Create a category
    category = Category(name="IT Support", description="Test Category")
    db.add(category)
    db.commit()
    db.refresh(category)

    response = client.post(
        "/api/v1/incidents/",
        headers=auth_header,
        json={
            "title": "Test Incident",
            "description": "This is a test incident",
            "priority": "MEDIUM",
            "category_id": str(category.id)
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Test Incident"
    assert data["status"] == "OPEN"
    assert "incident_key" in data

def test_incident_status_transition(client, admin_auth_header, auth_header, db):
    from app.models.models import Category, Incident
    # Setup
    category = Category(name="IT Support", description="Test Category")
    db.add(category)
    db.commit()
    
    response = client.post(
        "/api/v1/incidents/",
        headers=auth_header,
        json={
            "title": "Transition Test",
            "description": "Testing status transitions",
            "category_id": str(category.id)
        }
    )
    incident_id = response.json()["id"]

    # Transition to IN_PROGRESS
    response = client.patch(
        f"/api/v1/incidents/{incident_id}",
        headers=admin_auth_header,
        json={"status": "IN_PROGRESS"}
    )
    assert response.status_code == 200
    assert response.json()["status"] == "IN_PROGRESS"

    # Transition to RESOLVED (Staff/Admin only)
    response = client.patch(
        f"/api/v1/incidents/{incident_id}",
        headers=admin_auth_header,
        json={"status": "RESOLVED"}
    )
    assert response.status_code == 200
    assert response.json()["status"] == "RESOLVED"

def test_unauthorized_transition(client, auth_header, admin_auth_header, db):
    from app.models.models import Category, User, UserRole
    # Setup
    category = Category(name="IT Support", description="Test Category")
    db.add(category)
    db.commit()
    
    # Create incident as regular user
    response = client.post(
        "/api/v1/incidents/",
        headers=auth_header,
        json={
            "title": "Auth Test",
            "description": "Testing unauthorized transition",
            "category_id": str(category.id)
        }
    )
    incident_id = response.json()["id"]

    # Transition to IN_PROGRESS first (valid transition)
    client.patch(
        f"/api/v1/incidents/{incident_id}",
        headers=admin_auth_header,
        json={"status": "IN_PROGRESS"}
    )

    # Try to resolve as reporter (should fail - valid transition but wrong role)
    response = client.patch(
        f"/api/v1/incidents/{incident_id}",
        headers=auth_header,
        json={"status": "RESOLVED"}
    )
    assert response.status_code == 403
