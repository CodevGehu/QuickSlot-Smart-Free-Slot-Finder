import uuid
from sqlalchemy import Column, String, Integer, DateTime, JSON, Enum as SQLEnum, Index
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import enum
from app.core.database import Base

class JobStatus(str, enum.Enum):
    QUEUED = "QUEUED"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class OutboxStatus(str, enum.Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    SENT = "SENT"
    FAILED = "FAILED"

class ImportJob(Base):
    """
    OS Producer-Consumer Concept:
    FastAPI produces durable timetable import jobs into PostgreSQL.
    Background Python worker process consumes jobs using atomic leasing.
    """
    __tablename__ = "import_jobs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    campus_id = Column(String(50), nullable=False, default="main-campus-gehu")
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    sha256_digest = Column(String(64), nullable=False)
    status = Column(SQLEnum(JobStatus, name="job_status_enum"), nullable=False, default=JobStatus.QUEUED, index=True)
    progress_pct = Column(Integer, nullable=False, default=0)
    error_message = Column(String(1000), nullable=True)
    result_summary = Column(JSON, nullable=True)
    
    # Worker lease fields for fault-tolerance and crash recovery
    worker_id = Column(String(100), nullable=True)
    lease_expires_at = Column(DateTime(timezone=True), nullable=True, index=True)
    retry_count = Column(Integer, nullable=False, default=0)
    
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index("idx_import_jobs_consumer", "status", "lease_expires_at", "created_at"),
    )

class OutboxJob(Base):
    """
    Transactional Outbox Pattern & OS Consumer Queue:
    Events (e.g. notifications, cache invalidate, approval alerts) are written
    in the same transaction as state changes and processed asynchronously.
    """
    __tablename__ = "outbox_jobs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    campus_id = Column(String(50), nullable=False, default="main-campus-gehu")
    event_type = Column(String(100), nullable=False)  # e.g. "BOOKING_APPROVED", "TIMETABLE_PUBLISHED"
    payload = Column(JSON, nullable=False)
    status = Column(SQLEnum(OutboxStatus, name="outbox_status_enum"), nullable=False, default=OutboxStatus.PENDING, index=True)
    
    worker_id = Column(String(100), nullable=True)
    lease_expires_at = Column(DateTime(timezone=True), nullable=True, index=True)
    retry_count = Column(Integer, nullable=False, default=0)
    
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, index=True)
    processed_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("idx_outbox_jobs_consumer", "status", "lease_expires_at", "created_at"),
    )
