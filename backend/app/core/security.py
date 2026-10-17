import secrets
import hmac
import hashlib
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, InvalidHashError
from fastapi import Request, HTTPException, status, Depends
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db

ph = PasswordHasher(
    time_cost=2,
    memory_cost=19456,  # 19 MB
    parallelism=1,
    hash_len=32,
    salt_len=16
)

def hash_password(password: str) -> str:
    """Hashes a password using Argon2id."""
    return ph.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a password against an Argon2id hash."""
    try:
        return ph.verify(hashed_password, plain_password)
    except (VerifyMismatchError, InvalidHashError):
        return False

# In-memory fast session store backed by server-side state
# Key: session_token -> Dict containing user_id, role, campus_id, csrf_token, expires_at
_SESSIONS: Dict[str, Dict[str, Any]] = {}

def create_session(user_id: str, role: str, campus_id: str = "main-campus-gehu") -> tuple[str, str]:
    """
    Creates an opaque server-side session.
    Returns (session_token, csrf_token).
    """
    session_token = secrets.token_urlsafe(32)
    csrf_token = secrets.token_hex(24)
    expires_at = datetime.utcnow() + timedelta(days=7)
    
    _SESSIONS[session_token] = {
        "user_id": str(user_id),
        "role": str(role),
        "campus_id": campus_id,
        "csrf_token": csrf_token,
        "expires_at": expires_at
    }
    return session_token, csrf_token

def get_session(session_token: str) -> Optional[Dict[str, Any]]:
    session = _SESSIONS.get(session_token)
    if not session:
        return None
    if datetime.utcnow() > session["expires_at"]:
        _SESSIONS.pop(session_token, None)
        return None
    return session

def destroy_session(session_token: str) -> None:
    _SESSIONS.pop(session_token, None)

def get_current_user_session(request: Request) -> Dict[str, Any]:
    """
    Extracts session from HttpOnly cookie or Authorization Bearer header (for API testing).
    Validates CSRF token on state-changing requests if cookie was used.
    """
    session_token = request.cookies.get("session_id")
    is_cookie_auth = bool(session_token)
    
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
            
    if not session_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in."
        )
        
    session = get_session(session_token)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid. Please log in again."
        )
        
    # Enforce CSRF token verification for state-changing HTTP methods when cookie-authenticated
    if is_cookie_auth and request.method in ["POST", "PUT", "PATCH", "DELETE"]:
        csrf_header = request.headers.get("X-CSRF-Token")
        if not csrf_header or not hmac.compare_digest(csrf_header, session["csrf_token"]):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid or missing CSRF token."
            )
            
    return session

def require_roles(*allowed_roles: str):
    """Dependency factory ensuring user holds one of the required roles."""
    def role_checker(session: Dict[str, Any] = Depends(get_current_user_session)) -> Dict[str, Any]:
        user_role = session.get("role")
        if user_role not in allowed_roles and "ADMIN" != user_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Requires one of roles: {', '.join(allowed_roles)}"
            )
        return session
    return role_checker
