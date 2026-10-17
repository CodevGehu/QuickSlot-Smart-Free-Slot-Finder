import sys
import pytest
from pathlib import Path
from fastapi.testclient import TestClient

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.main import app
from app.core.database import SessionLocal, engine, Base, ensure_extensions
from app.core.security import create_session
from app.models.identity import User, UserRole

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    ensure_extensions()
    Base.metadata.create_all(bind=engine)
    yield

@pytest.fixture
def db_session():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def auth_headers(db_session):
    def _get_headers(role_or_user):
        if isinstance(role_or_user, User):
            user = role_or_user
        elif isinstance(role_or_user, str) and "@" in role_or_user:
            user = db_session.query(User).filter(User.email == role_or_user, User.is_active == True).first()
        else:
            user = db_session.query(User).filter(User.role == role_or_user, User.is_active == True).first()
            
        if not user:
            raise ValueError(f"No user found for {role_or_user}")
        session_token, csrf_token = create_session(str(user.id), user.role.value)
        return {
            "Authorization": f"Bearer {session_token}",
            "X-CSRF-Token": csrf_token
        }
    return _get_headers
