import uuid
from sqlalchemy import Column, String, Integer, Date, DateTime, ForeignKey, UniqueConstraint, Index, JSON
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
from app.core.database import Base

class CampusMetadata(Base):
    """
    Maintains global campus schedule_rev (S) and catalog_rev (C)
    for version-aware Valkey cache validation as specified in Section 8 of Proposal.
    """
    __tablename__ = "campus_metadata"
    
    campus_id = Column(String(50), primary_key=True, default="main-campus-gehu")
    schedule_rev = Column(Integer, nullable=False, default=1)
    catalog_rev = Column(Integer, nullable=False, default=1)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

class ResourceDayState(Base):
    """
    Section 7 & 11: Stable resource-and-date coordination rows.
    Prevents phantom intervals (locking an empty slot where no booking row exists yet).
    Approval transactions SELECT FOR UPDATE on these rows in sorted ascending key order.
    Also tracks resource/day revision (R) for versioned caching.
    """
    __tablename__ = "resource_day_state"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    campus_id = Column(String(50), nullable=False, default="main-campus-gehu")
    resource_id = Column(UUID(as_uuid=True), ForeignKey("venues.id", ondelete="CASCADE"), nullable=False)
    local_date = Column(Date, nullable=False)
    data_rev = Column(Integer, nullable=False, default=1)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("campus_id", "resource_id", "local_date", name="uq_resource_day_state"),
        Index("idx_resource_day_lookup", "campus_id", "resource_id", "local_date"),
    )

class IdempotencyRecord(Base):
    """
    Section 7 & 11: Deduplicates state-changing commands (e.g. repeated request submissions or approvals).
    Stores payload hash and committed response.
    """
    __tablename__ = "idempotency_records"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    campus_id = Column(String(50), nullable=False, default="main-campus-gehu")
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    request_key = Column(String(100), nullable=False)
    payload_hash = Column(String(64), nullable=False)
    response_code = Column(Integer, nullable=False)
    response_body = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("campus_id", "user_id", "request_key", name="uq_idempotency_user_key"),
        Index("idx_idempotency_lookup", "campus_id", "user_id", "request_key"),
    )
