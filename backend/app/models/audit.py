import uuid
from sqlalchemy import Column, String, DateTime, JSON, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
from app.core.database import Base

class AuditLog(Base):
    """
    Durable, immutable audit log of critical administrative and booking actions.
    Section 3 & 8: Records approver, requester, timetable changes, cancellations.
    """
    __tablename__ = "audit_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    campus_id = Column(String(50), nullable=False, default="main-campus-gehu", index=True)
    actor_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(100), nullable=False)  # e.g. "APPROVE_BOOKING", "CANCEL_BOOKING", "PUBLISH_TIMETABLE"
    entity_type = Column(String(50), nullable=False)  # "booking", "timetable_version", "venue"
    entity_id = Column(String(100), nullable=False)
    details = Column(JSON, nullable=True)
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, index=True)

    __table_args__ = (
        Index("idx_audit_logs_actor_action", "actor_user_id", "action"),
        Index("idx_audit_logs_entity", "entity_type", "entity_id"),
    )
