import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.database import Base, get_db
from app.core import security

# Use a dedicated Postgres database for testing
SQLALCHEMY_DATABASE_URL = "postgresql://postgres:service_now_pwd_2026@service-now-db:5432/service_now_test"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session")
def db_engine():
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def db(db_engine):
    connection = db_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    
    yield session
    
    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture(scope="function")
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass
            
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

@pytest.fixture(scope="function")
def test_user(db):
    from app.models.models import User, UserRole
    user = User(
        email="test@example.com",
        hashed_password=security.get_password_hash("password"),
        full_name="Test User",
        role=UserRole.REPORTER,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@pytest.fixture(scope="function")
def test_admin(db):
    from app.models.models import User, UserRole
    user = User(
        email="admin@example.com",
        hashed_password=security.get_password_hash("password"),
        full_name="Admin User",
        role=UserRole.ADMIN,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@pytest.fixture(scope="function")
def auth_header(test_user):
    token = security.create_access_token(test_user.id)
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture(scope="function")
def admin_auth_header(test_admin):
    token = security.create_access_token(test_admin.id)
    return {"Authorization": f"Bearer {token}"}
