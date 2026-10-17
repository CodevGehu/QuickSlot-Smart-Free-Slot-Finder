from fastapi import APIRouter, Depends, HTTPException, Response, Request, status
from sqlalchemy.orm import Session
from uuid import UUID

from app.core.database import get_db
from app.core.security import (
    hash_password, verify_password, create_session, 
    get_current_user_session, destroy_session
)
from app.models.identity import User, UserRole, Department
from app.schemas.auth import LoginRequest, LoginResponse, UserOut

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower().strip()).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated."
        )
        
    session_id, csrf_token = create_session(str(user.id), user.role.value)
    
    # Set HttpOnly, SameSite cookie
    response.set_cookie(
        key="session_id",
        value=session_id,
        httponly=True,
        samesite="lax",
        secure=False,  # Set to True in production HTTPS
        max_age=7 * 86400
    )
    
    return LoginResponse(
        user=UserOut.from_orm(user),
        csrf_token=csrf_token,
        session_id=session_id
    )

@router.post("/logout")
def logout(request: Request, response: Response):
    session_id = request.cookies.get("session_id")
    if session_id:
        destroy_session(session_id)
    response.delete_cookie("session_id")
    return {"message": "Logged out successfully."}

@router.get("/me", response_model=UserOut)
def get_current_user(
    session: dict = Depends(get_current_user_session),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == UUID(session["user_id"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return UserOut.from_orm(user)

@router.get("/users", response_model=list[UserOut])
def list_demo_users(db: Session = Depends(get_db)):
    """Returns sample users for easy role testing in hackathon demonstration."""
    users = db.query(User).filter(User.is_active == True).limit(20).all()
    return [UserOut.from_orm(u) for u in users]

@router.post("/switch-demo-role")
def switch_demo_role(
    role: UserRole, 
    response: Response, 
    db: Session = Depends(get_db)
):
    """
    Convenience endpoint for college evaluation:
    Quickly switches active session to a designated user of requested role.
    """
    user = db.query(User).filter(User.role == role, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=404, detail=f"No user found with role {role.value}")
        
    session_id, csrf_token = create_session(str(user.id), user.role.value)
    response.set_cookie(
        key="session_id",
        value=session_id,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=7 * 86400
    )
    return {
        "message": f"Switched to user {user.full_name} ({user.role.value})",
        "user": UserOut.from_orm(user),
        "csrf_token": csrf_token,
        "session_id": session_id
    }
