from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.security import require_roles, hash_password
from app.models.identity import User, UserRole, Department
from app.models.resources import Venue, VenueType, AllocationAssignment
from app.models.booking import Booking, BookingRequest, BookingRequestStatus, BookingLifecycleStatus
from app.models.timetable import TimetableVersion
from app.models.audit import AuditLog

router = APIRouter(prefix="/admin", tags=["Module D: Administration"])

class VenueCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    venue_type_id: UUID
    capacity: int = Field(..., gt=0)
    building: str
    floor: int = 1
    features: List[str] = []
    approval_required: bool = True

class AllocationAssignmentCreate(BaseModel):
    faculty_user_id: UUID
    venue_id: Optional[UUID] = None
    building: Optional[str] = None

class UserAdminCreate(BaseModel):
    faculty_id: str
    full_name: str
    email: str
    password: str
    role: UserRole
    department_id: Optional[UUID] = None

@router.get("/stats")
def get_admin_dashboard_stats(
    session: dict = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db)
):
    total_venues = db.query(Venue).count()
    total_users = db.query(User).count()
    pending_requests = db.query(BookingRequest).filter(BookingRequest.status == BookingRequestStatus.PENDING).count()
    confirmed_bookings = db.query(Booking).filter(Booking.status == BookingLifecycleStatus.ACTIVE).count()
    active_timetable = db.query(TimetableVersion).filter(TimetableVersion.is_active == True).first()
    recent_audits = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(10).all()

    return {
        "total_venues": total_venues,
        "total_users": total_users,
        "pending_requests": pending_requests,
        "confirmed_bookings": confirmed_bookings,
        "active_timetable": active_timetable.name if active_timetable else "None (Drafts only)",
        "recent_audits": [
            {
                "id": a.id,
                "action": a.action,
                "actor": a.actor_user_id,
                "entity": f"{a.entity_type} ({a.entity_id})",
                "details": a.details,
                "created_at": a.created_at
            }
            for a in recent_audits
        ]
    }

@router.get("/venues")
def list_venues(db: Session = Depends(get_db)):
    venues = db.query(Venue).order_by(Venue.building, Venue.name).all()
    types = db.query(VenueType).all()
    type_map = {t.id: t.name for t in types}
    
    return [
        {
            "id": v.id,
            "name": v.name,
            "venue_type_id": v.venue_type_id,
            "venue_type_name": type_map.get(v.venue_type_id, "General"),
            "capacity": v.capacity,
            "building": v.building,
            "floor": v.floor,
            "features": v.features,
            "approval_required": v.approval_required,
            "is_active": v.is_active
        }
        for v in venues
    ]

@router.post("/venues", status_code=status.HTTP_201_CREATED)
def create_venue(
    payload: VenueCreate,
    session: dict = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db)
):
    existing = db.query(Venue).filter(Venue.name.ilike(payload.name)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Venue with this name already exists.")

    venue = Venue(
        name=payload.name,
        venue_type_id=payload.venue_type_id,
        capacity=payload.capacity,
        building=payload.building,
        floor=payload.floor,
        features=payload.features,
        approval_required=payload.approval_required
    )
    db.add(venue)
    db.commit()
    db.refresh(venue)
    return {"message": "Venue created successfully.", "venue_id": venue.id}

@router.get("/venue-types")
def list_venue_types(db: Session = Depends(get_db)):
    types = db.query(VenueType).all()
    return [{"id": t.id, "name": t.name, "description": t.description} for t in types]

@router.get("/allocation-assignments")
def list_allocation_assignments(
    session: dict = Depends(require_roles("ADMIN", "ALLOCATION_FACULTY")),
    db: Session = Depends(get_db)
):
    assignments = db.query(AllocationAssignment).filter(AllocationAssignment.is_active == True).all()
    return [
        {
            "id": a.id,
            "faculty_user_id": a.faculty_user_id,
            "faculty_name": a.faculty_user.full_name if a.faculty_user else "Unknown",
            "faculty_email": a.faculty_user.email if a.faculty_user else "",
            "venue_id": a.venue_id,
            "venue_name": a.venue.name if a.venue else None,
            "building": a.building,
            "scope_description": f"Room: {a.venue.name}" if a.venue else f"Entire Building: {a.building}",
            "created_at": a.created_at
        }
        for a in assignments
    ]

@router.post("/allocation-assignments", status_code=status.HTTP_201_CREATED)
def create_allocation_assignment(
    payload: AllocationAssignmentCreate,
    session: dict = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db)
):
    if not payload.venue_id and not payload.building:
        raise HTTPException(status_code=400, detail="Must specify either a venue_id or a building name.")

    assignment = AllocationAssignment(
        faculty_user_id=payload.faculty_user_id,
        venue_id=payload.venue_id,
        building=payload.building
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return {"message": "Allocation assignment saved successfully.", "id": assignment.id}

@router.get("/audit-logs")
def list_audit_logs(
    limit: int = 50,
    session: dict = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db)
):
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()
    return [
        {
            "id": l.id,
            "actor_user_id": l.actor_user_id,
            "action": l.action,
            "entity_type": l.entity_type,
            "entity_id": l.entity_id,
            "details": l.details,
            "ip_address": l.ip_address,
            "created_at": l.created_at
        }
        for l in logs
    ]

@router.post("/users", status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserAdminCreate,
    session: dict = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db)
):
    existing = db.query(User).filter(
        (User.email == payload.email.lower().strip()) | (User.faculty_id == payload.faculty_id.strip())
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email or faculty ID already exists.")

    new_user = User(
        faculty_id=payload.faculty_id.strip(),
        full_name=payload.full_name.strip(),
        email=payload.email.lower().strip(),
        password_hash=hash_password(payload.password),
        role=payload.role,
        department_id=payload.department_id
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "User created successfully.", "user_id": new_user.id}
