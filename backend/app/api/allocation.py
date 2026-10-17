from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import Optional, List
from uuid import UUID

from app.core.database import get_db
from app.core.security import get_current_user_session, require_roles
from app.models.identity import User, UserRole
from app.models.resources import Venue, AllocationAssignment
from app.models.booking import BookingRequest, Booking, BookingRequestStatus
from app.schemas.booking import BookingRequestOut, ApprovalDecisionRequest, RejectionDecisionRequest, BookingOut
from app.services.booking_service import BookingService

router = APIRouter(prefix="/allocation", tags=["Module C: Allocation Faculty Inbox"])

@router.get("/inbox", response_model=List[BookingRequestOut])
def get_allocation_inbox(
    session: dict = Depends(require_roles("ALLOCATION_FACULTY", "ADMIN")),
    db: Session = Depends(get_db)
):
    """
    Returns pending booking requests for rooms or buildings
    assigned to the current allocation faculty member.
    """
    user_id = UUID(session["user_id"])
    user = db.query(User).filter(User.id == user_id).first()
    
    # If ADMIN, can view all pending requests
    if user.role == UserRole.ADMIN:
        requests = db.query(BookingRequest).filter(
            BookingRequest.status == BookingRequestStatus.PENDING
        ).order_by(BookingRequest.created_at.asc()).all()
    else:
        # Get active assignments
        assignments = db.query(AllocationAssignment).filter(
            AllocationAssignment.faculty_user_id == user.id,
            AllocationAssignment.is_active == True
        ).all()
        
        assigned_venue_ids = [a.venue_id for a in assignments if a.venue_id]
        assigned_buildings = [a.building for a in assignments if a.building]
        
        # Find venues covered by building assignment
        if assigned_buildings:
            b_venue_ids = [row[0] for row in db.query(Venue.id).filter(Venue.building.in_(assigned_buildings)).all()]
            assigned_venue_ids.extend(b_venue_ids)
            
        assigned_venue_ids = list(set(assigned_venue_ids))
        
        if not assigned_venue_ids:
            return []
            
        requests = db.query(BookingRequest).filter(
            BookingRequest.status == BookingRequestStatus.PENDING,
            BookingRequest.venue_id.in_(assigned_venue_ids)
        ).order_by(BookingRequest.created_at.asc()).all()

    return [
        BookingRequestOut(
            id=r.id,
            campus_id=r.campus_id,
            requested_by_user_id=r.requested_by_user_id,
            requester_name=r.requester.full_name if r.requester else None,
            requester_role=r.requester.role.value if r.requester else None,
            venue_id=r.venue_id,
            venue_name=r.venue.name if r.venue else None,
            building=r.venue.building if r.venue else None,
            purpose=r.purpose,
            booking_date=r.booking_date,
            start_time=r.start_time,
            end_time=r.end_time,
            expected_attendance=r.expected_attendance,
            required_equipment=r.required_equipment,
            participant_group=r.participant_group,
            status=r.status,
            rejection_reason=r.rejection_reason,
            conflict_message=r.conflict_message,
            reviewed_by_user_id=r.reviewed_by_user_id,
            reviewed_at=r.reviewed_at,
            created_at=r.created_at,
            revision=r.revision
        )
        for r in requests
    ]

@router.post("/requests/{request_id}/approve", response_model=BookingOut)
def approve_booking_request(
    request_id: UUID,
    payload: Optional[ApprovalDecisionRequest] = None,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    session: dict = Depends(require_roles("ALLOCATION_FACULTY", "ADMIN")),
    db: Session = Depends(get_db)
):
    approver = db.query(User).filter(User.id == UUID(session["user_id"])).first()
    booking = BookingService.approve_request(
        db=db,
        approver=approver,
        request_id=request_id,
        idempotency_key=idempotency_key
    )
    return BookingOut(
        id=booking.id,
        request_id=booking.request_id,
        venue_id=booking.venue_id,
        venue_name=booking.venue.name if booking.venue else None,
        building=booking.venue.building if booking.venue else None,
        booked_by_user_id=booking.booked_by_user_id,
        booked_by_name=booking.booked_by.full_name if booking.booked_by else None,
        booking_date=booking.booking_date,
        start_time=booking.start_time,
        end_time=booking.end_time,
        status=booking.status,
        approved_by_user_id=booking.approved_by_user_id,
        approved_by_name=booking.approved_by.full_name if booking.approved_by else None,
        cancellation_reason=booking.cancellation_reason,
        created_at=booking.created_at
    )

@router.post("/requests/{request_id}/reject", response_model=BookingRequestOut)
def reject_booking_request(
    request_id: UUID,
    payload: RejectionDecisionRequest,
    session: dict = Depends(require_roles("ALLOCATION_FACULTY", "ADMIN")),
    db: Session = Depends(get_db)
):
    approver = db.query(User).filter(User.id == UUID(session["user_id"])).first()
    req = BookingService.reject_request(
        db=db,
        approver=approver,
        request_id=request_id,
        rejection_reason=payload.rejection_reason
    )
    return BookingRequestOut(
        id=req.id,
        campus_id=req.campus_id,
        requested_by_user_id=req.requested_by_user_id,
        requester_name=req.requester.full_name if req.requester else None,
        requester_role=req.requester.role.value if req.requester else None,
        venue_id=req.venue_id,
        venue_name=req.venue.name if req.venue else None,
        building=req.venue.building if req.venue else None,
        purpose=req.purpose,
        booking_date=req.booking_date,
        start_time=req.start_time,
        end_time=req.end_time,
        expected_attendance=req.expected_attendance,
        required_equipment=req.required_equipment,
        participant_group=req.participant_group,
        status=req.status,
        rejection_reason=req.rejection_reason,
        conflict_message=req.conflict_message,
        reviewed_by_user_id=req.reviewed_by_user_id,
        reviewed_at=req.reviewed_at,
        created_at=req.created_at,
        revision=req.revision
    )
