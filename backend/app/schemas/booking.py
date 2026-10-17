from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from datetime import date, time, datetime
from app.models.booking import BookingRequestStatus, BookingLifecycleStatus

class BookingRequestCreate(BaseModel):
    venue_id: UUID
    purpose: str = Field(..., min_length=3, max_length=255)
    booking_date: date
    start_time: time
    end_time: time
    expected_attendance: int = Field(default=1, gt=0)
    required_equipment: Optional[str] = None
    participant_group: Optional[str] = None

class BookingRequestOut(BaseModel):
    id: UUID
    campus_id: str
    requested_by_user_id: UUID
    requester_name: Optional[str] = None
    requester_role: Optional[str] = None
    venue_id: UUID
    venue_name: Optional[str] = None
    building: Optional[str] = None
    purpose: str
    booking_date: date
    start_time: time
    end_time: time
    expected_attendance: int
    required_equipment: Optional[str] = None
    participant_group: Optional[str] = None
    status: BookingRequestStatus
    rejection_reason: Optional[str] = None
    conflict_message: Optional[str] = None
    reviewed_by_user_id: Optional[UUID] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime
    revision: int

    class Config:
        from_attributes = True

class ApprovalDecisionRequest(BaseModel):
    notes: Optional[str] = None

class RejectionDecisionRequest(BaseModel):
    rejection_reason: str = Field(..., min_length=3, max_length=255)

class CancellationRequest(BaseModel):
    cancellation_reason: str = Field(..., min_length=3, max_length=255)

class BookingOut(BaseModel):
    id: UUID
    request_id: UUID
    venue_id: UUID
    venue_name: Optional[str] = None
    building: Optional[str] = None
    booked_by_user_id: UUID
    booked_by_name: Optional[str] = None
    booking_date: date
    start_time: time
    end_time: time
    status: BookingLifecycleStatus
    approved_by_user_id: UUID
    approved_by_name: Optional[str] = None
    cancellation_reason: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
