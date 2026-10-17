from pydantic import BaseModel, EmailStr
from typing import Optional
from uuid import UUID
from datetime import datetime
from app.models.identity import UserRole

class LoginRequest(BaseModel):
    email: str
    password: str

class UserCreate(BaseModel):
    faculty_id: str
    full_name: str
    email: str
    password: str
    role: UserRole = UserRole.STUDENT
    department_id: Optional[UUID] = None

class UserOut(BaseModel):
    id: UUID
    faculty_id: str
    full_name: str
    email: str
    role: UserRole
    department_id: Optional[UUID] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class LoginResponse(BaseModel):
    user: UserOut
    csrf_token: str
    session_id: str
