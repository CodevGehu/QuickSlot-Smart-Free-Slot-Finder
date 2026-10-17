from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional, List
from uuid import UUID

from app.core.database import get_db
from app.core.security import get_current_user_session
from app.models.identity import User
from app.models.booking import BookingRequest, Booking, BookingRequestStatus, BookingLifecycleStatus
from app.schemas.booking import BookingRequestCreate, BookingRequestOut, BookingOut, CancellationRequest
from app.services.booking_service import BookingService

router = APIRouter(tags=["Module C: Venue Booking & Requester Actions"])

@router.post("/requests", response_model=BookingRequestOut, status_code=status.HTTP_201_CREATED)
def submit_booking_request(
    payload: BookingRequestCreate,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    session: dict = Depends(get_current_user_session),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == UUID(session["user_id"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    req = BookingService.submit_request(
        db=db,
        requester=user,
        venue_id=payload.venue_id,
        purpose=payload.purpose,
        booking_date=payload.booking_date,
        start_time=payload.start_time,
        end_time=payload.end_time,
        expected_attendance=payload.expected_attendance,
        required_equipment=payload.required_equipment,
        participant_group=payload.participant_group,
        idempotency_key=idempotency_key
    )
    
    return BookingRequestOut(
        id=req.id,
        campus_id=req.campus_id,
        requested_by_user_id=req.requested_by_user_id,
        requester_name=user.full_name,
        requester_role=user.role.value,
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

@router.get("/requests/mine", response_model=List[BookingRequestOut])
def get_my_requests(
    session: dict = Depends(get_current_user_session),
    db: Session = Depends(get_db)
):
    user_id = UUID(session["user_id"])
    requests = db.query(BookingRequest).filter(
        BookingRequest.requested_by_user_id == user_id
    ).order_by(BookingRequest.created_at.desc()).all()

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

@router.post("/requests/{request_id}/withdraw", response_model=BookingRequestOut)
def withdraw_request(
    request_id: UUID,
    session: dict = Depends(get_current_user_session),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == UUID(session["user_id"])).first()
    req = BookingService.withdraw_request(db=db, requester=user, request_id=request_id)
    return BookingRequestOut(
        id=req.id,
        campus_id=req.campus_id,
        requested_by_user_id=req.requested_by_user_id,
        requester_name=user.full_name,
        requester_role=user.role.value,
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

@router.get("/bookings/mine", response_model=List[BookingOut])
def get_my_bookings(
    session: dict = Depends(get_current_user_session),
    db: Session = Depends(get_db)
):
    user_id = UUID(session["user_id"])
    bookings = db.query(Booking).filter(
        Booking.booked_by_user_id == user_id
    ).order_by(Booking.created_at.desc()).all()

    return [
        BookingOut(
            id=b.id,
            request_id=b.request_id,
            venue_id=b.venue_id,
            venue_name=b.venue.name if b.venue else None,
            building=b.venue.building if b.venue else None,
            booked_by_user_id=b.booked_by_user_id,
            booked_by_name=b.booked_by.full_name if b.booked_by else None,
            booking_date=b.booking_date,
            start_time=b.start_time,
            end_time=b.end_time,
            status=b.status,
            approved_by_user_id=b.approved_by_user_id,
            approved_by_name=b.approved_by.full_name if b.approved_by else None,
            cancellation_reason=b.cancellation_reason,
            created_at=b.created_at
        )
        for b in bookings
    ]

@router.post("/bookings/{booking_id}/cancel", response_model=BookingOut)
def cancel_booking(
    booking_id: UUID,
    payload: CancellationRequest,
    session: dict = Depends(get_current_user_session),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == UUID(session["user_id"])).first()
    booking = BookingService.cancel_booking(
        db=db,
        actor=user,
        booking_id=booking_id,
        cancellation_reason=payload.cancellation_reason
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
