import uuid
from sqlalchemy import Column, String, Integer, SmallInteger, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class VenueType(Base):
    __tablename__ = "venue_types"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(50), nullable=False, unique=True)
    description = Column(String(255), nullable=True)
    
    venues = relationship("Venue", back_populates="venue_type")

class Venue(Base):
    __tablename__ = "venues"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    campus_id = Column(String(50), nullable=False, default="main-campus-gehu", index=True)
    name = Column(String(100), nullable=False, unique=True)
    venue_type_id = Column(UUID(as_uuid=True), ForeignKey("venue_types.id", ondelete="RESTRICT"), nullable=False)
    capacity = Column(Integer, nullable=False)
    building = Column(String(100), nullable=False, index=True)
    floor = Column(SmallInteger, nullable=False, default=1)
    features = Column(JSON, nullable=False, default=list)  # e.g. ["Projector", "AC", "Computers"]
    approval_required = Column(Boolean, nullable=False, default=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    
    venue_type = relationship("VenueType", back_populates="venues")
    allocation_assignments = relationship("AllocationAssignment", back_populates="venue")
    timetable_entries = relationship("TimetableEntry", back_populates="venue")
    bookings = relationship("Booking", back_populates="venue")
    booking_requests = relationship("BookingRequest", back_populates="venue")

class AllocationAssignment(Base):
    """
    Links designated faculty members to specific venues or entire buildings.
    Section 1 & 7: Only faculty explicitly assigned the allocation role for the
    selected space can approve or reject a request.
    """
    __tablename__ = "allocation_assignments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    campus_id = Column(String(50), nullable=False, default="main-campus-gehu")
    faculty_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    venue_id = Column(UUID(as_uuid=True), ForeignKey("venues.id", ondelete="CASCADE"), nullable=True)
    building = Column(String(100), nullable=True)  # If venue_id is null, applies to whole building
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    
    faculty_user = relationship("User", back_populates="allocation_assignments")
    venue = relationship("Venue", back_populates="allocation_assignments")
