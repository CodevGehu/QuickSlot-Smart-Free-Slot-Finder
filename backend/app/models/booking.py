import uuid
from sqlalchemy import (
    Column, String, Integer, Boolean, DateTime, Date, Time, 
    ForeignKey, Enum as SQLEnum, CheckConstraint, Index, text, Computed
)
from sqlalchemy.dialects.postgresql import UUID, TSTZRANGE, ExcludeConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.core.database import Base

class BookingRequestStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    WITHDRAWN = "WITHDRAWN"
    EXPIRED = "EXPIRED"

class BookingLifecycleStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    CANCELLED = "CANCELLED"

class OccupancyEventType(str, enum.Enum):
    CLASS = "CLASS"
    BOOKING = "BOOKING"
    CLOSURE = "CLOSURE"

class BookingRequest(Base):
    __tablename__ = "booking_requests"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    campus_id = Column(String(50), nullable=False, default="main-campus-gehu", index=True)
    requested_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    venue_id = Column(UUID(as_uuid=True), ForeignKey("venues.id", ondelete="RESTRICT"), nullable=False)
    purpose = Column(String(255), nullable=False)
    booking_date = Column(Date, nullable=False, index=True)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    expected_attendance = Column(Integer, nullable=False, default=1)
    required_equipment = Column(String(255), nullable=True)  # Comma separated or json
    participant_group = Column(String(100), nullable=True)   # e.g. "Club ACM", "Section A1"
    
    status = Column(SQLEnum(BookingRequestStatus, name="booking_request_status_enum"), nullable=False, default=BookingRequestStatus.PENDING, index=True)
    rejection_reason = Column(String(255), nullable=True)
    reviewed_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    conflict_message = Column(String(255), nullable=True)
    
    # Revision field to detect concurrent modifications (Optimistic concurrency control token)
    revision = Column(Integer, nullable=False, default=1)
    
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    requester = relationship("User", foreign_keys=[requested_by_user_id])
    reviewer = relationship("User", foreign_keys=[reviewed_by_user_id])
    venue = relationship("Venue", back_populates="booking_requests")
    booking = relationship("Booking", back_populates="request", uselist=False)

    __table_args__ = (
        CheckConstraint("start_time < end_time", name="chk_request_time_range"),
        CheckConstraint("expected_attendance > 0", name="chk_request_attendance"),
        Index("idx_booking_requests_dashboard", "status", "booking_date"),
        Index("idx_booking_requests_user", "requested_by_user_id", "status"),
    )

class Booking(Base):
    __tablename__ = "bookings"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    campus_id = Column(String(50), nullable=False, default="main-campus-gehu", index=True)
    request_id = Column(UUID(as_uuid=True), ForeignKey("booking_requests.id", ondelete="RESTRICT"), nullable=False, unique=True)
    venue_id = Column(UUID(as_uuid=True), ForeignKey("venues.id", ondelete="RESTRICT"), nullable=False)
    booked_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    booking_date = Column(Date, nullable=False, index=True)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    approved_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    
    status = Column(SQLEnum(BookingLifecycleStatus, name="booking_lifecycle_status_enum"), nullable=False, default=BookingLifecycleStatus.ACTIVE)
    cancellation_reason = Column(String(255), nullable=True)
    cancelled_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=True)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    
    request = relationship("BookingRequest", back_populates="booking")
    venue = relationship("Venue", back_populates="bookings")
    booked_by = relationship("User", foreign_keys=[booked_by_user_id])
    approved_by = relationship("User", foreign_keys=[approved_by_user_id])
    cancelled_by = relationship("User", foreign_keys=[cancelled_by_user_id])
    occupancies = relationship("ResourceOccupancy", back_populates="booking", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("start_time < end_time", name="chk_booking_time_range"),
        Index("idx_bookings_lookup", "venue_id", "booking_date", "start_time", "end_time"),
    )

class ResourceOccupancy(Base):
    """
    Physical authoritative table holding all active occupancies:
    - Classes expanded from active timetable versions
    - Confirmed reservations
    - Room closures / maintenance restrictions
    
    Enforces non-overlapping intervals via PostgreSQL btree_gist exclusion constraint:
    EXCLUDE USING gist (campus_id WITH =, resource_id WITH =, during WITH &&) WHERE (is_active)
    """
    __tablename__ = "resource_occupancy"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    campus_id = Column(String(50), nullable=False, default="main-campus-gehu")
    resource_id = Column(UUID(as_uuid=True), ForeignKey("venues.id", ondelete="CASCADE"), nullable=False)
    event_type = Column(SQLEnum(OccupancyEventType, name="occupancy_event_type_enum"), nullable=False)
    
    booking_id = Column(UUID(as_uuid=True), ForeignKey("bookings.id", ondelete="CASCADE"), nullable=True)
    timetable_entry_id = Column(UUID(as_uuid=True), ForeignKey("timetable_entries.id", ondelete="CASCADE"), nullable=True)
    
    starts_at = Column(DateTime(timezone=True), nullable=False)
    ends_at = Column(DateTime(timezone=True), nullable=False)
    
    # Generated half-open tstzrange [starts_at, ends_at)
    during = Column(
        TSTZRANGE,
        Computed("tstzrange(starts_at, ends_at, '[)')", persisted=True),
        nullable=False
    )
    
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    
    booking = relationship("Booking", back_populates="occupancies")
    venue = relationship("Venue")

    __table_args__ = (
        CheckConstraint("starts_at < ends_at", name="chk_occupancy_starts_before_ends"),
        # Exclusion Constraint: guarantees NO two active records can overlap in time for the same resource
        ExcludeConstraint(
            ("campus_id", "="),
            ("resource_id", "="),
            ("during", "&&"),
            where=text("is_active = true"),
            name="exclude_resource_occupancy_overlap"
        ),
        Index("idx_occupancy_resource_range", "resource_id", "starts_at", "ends_at"),
    )
