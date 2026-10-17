import uuid
from sqlalchemy import Column, String, Integer, SmallInteger, Boolean, DateTime, Date, Time, ForeignKey, Enum as SQLEnum, CheckConstraint, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.core.database import Base

class TimetableStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"
    ARCHIVED = "ARCHIVED"

class TimetableEntryType(str, enum.Enum):
    LECTURE = "LECTURE"
    LAB = "LAB"
    TUTORIAL = "TUTORIAL"
    SEMINAR = "SEMINAR"
    WORKSHOP = "WORKSHOP"

class Section(Base):
    __tablename__ = "sections"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(50), nullable=False)  # e.g. "A1", "B2", "ML1"
    semester = Column(SmallInteger, nullable=False, default=5)
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id", ondelete="RESTRICT"), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    
    department = relationship("Department", back_populates="sections")
    timetable_entries = relationship("TimetableEntry", back_populates="section")

class Subject(Base):
    __tablename__ = "subjects"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(30), nullable=False, unique=True)  # e.g. "TCS 502", "PCS 502"
    name = Column(String(150), nullable=False)
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id", ondelete="RESTRICT"), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    
    department = relationship("Department", back_populates="subjects")
    timetable_entries = relationship("TimetableEntry", back_populates="subject")

class TimetableVersion(Base):
    __tablename__ = "timetable_versions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    campus_id = Column(String(50), nullable=False, default="main-campus-gehu", index=True)
    name = Column(String(100), nullable=False)
    academic_year = Column(String(20), nullable=False, default="2026-2027")
    effective_from = Column(Date, nullable=False)
    effective_until = Column(Date, nullable=True)
    status = Column(SQLEnum(TimetableStatus, name="timetable_status_enum"), nullable=False, default=TimetableStatus.DRAFT)
    is_active = Column(Boolean, nullable=False, default=False)
    uploaded_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    source_filename = Column(String(255), nullable=True)
    source_hash = Column(String(64), nullable=True)  # SHA-256
    notes = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    published_at = Column(DateTime(timezone=True), nullable=True)
    
    entries = relationship("TimetableEntry", back_populates="version", cascade="all, delete-orphan")

class TimetableEntry(Base):
    __tablename__ = "timetable_entries"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    version_id = Column(UUID(as_uuid=True), ForeignKey("timetable_versions.id", ondelete="CASCADE"), nullable=False)
    section_id = Column(UUID(as_uuid=True), ForeignKey("sections.id", ondelete="RESTRICT"), nullable=True)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="RESTRICT"), nullable=False)
    faculty_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=True)
    venue_id = Column(UUID(as_uuid=True), ForeignKey("venues.id", ondelete="RESTRICT"), nullable=False)
    day_of_week = Column(SmallInteger, nullable=False)  # 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    entry_type = Column(SQLEnum(TimetableEntryType, name="timetable_entry_type_enum"), nullable=False, default=TimetableEntryType.LECTURE)
    source_ref = Column(String(100), nullable=True)  # e.g. "Page 1, Cell (Row 3, Col 4)"
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    
    version = relationship("TimetableVersion", back_populates="entries")
    section = relationship("Section", back_populates="timetable_entries")
    subject = relationship("Subject", back_populates="timetable_entries")
    venue = relationship("Venue", back_populates="timetable_entries")
    faculty = relationship("User", foreign_keys=[faculty_id])

    __table_args__ = (
        CheckConstraint("start_time < end_time", name="chk_timetable_time_range"),
        CheckConstraint("day_of_week BETWEEN 1 AND 7", name="chk_day_of_week"),
        Index("idx_timetable_entries_lookup", "version_id", "day_of_week", "venue_id", "start_time", "end_time"),
        Index("idx_timetable_entries_faculty", "faculty_id", "version_id", "day_of_week"),
    )
