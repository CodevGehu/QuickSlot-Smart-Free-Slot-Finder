from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from datetime import date, time, datetime
from app.models.timetable import TimetableStatus, TimetableEntryType

class ScheduledClass(BaseModel):
    subject_code: str
    subject_name: str
    section: str
    venue_name: str
    building: str
    start_time: str
    end_time: str
    entry_type: TimetableEntryType
    source_ref: Optional[str] = None

class FreePeriod(BaseModel):
    start_time: str
    end_time: str
    duration_minutes: int

class TeacherScheduleResponse(BaseModel):
    teacher_id: Optional[UUID] = None
    teacher_name: str
    department: Optional[str] = None
    day_of_week: int
    day_name: str
    query_date: Optional[date] = None
    scheduled_classes: List[ScheduledClass] = []
    free_periods: List[FreePeriod] = []
    next_scheduled_class: Optional[ScheduledClass] = None
    disclaimer: str = "This schedule reflects official college timetable records, not real-time GPS location."

class TimetableVersionOut(BaseModel):
    id: UUID
    campus_id: str
    name: str
    academic_year: str
    effective_from: date
    effective_until: Optional[date] = None
    status: TimetableStatus
    is_active: bool
    source_filename: Optional[str] = None
    source_hash: Optional[str] = None
    notes: Optional[str] = None
    entry_count: int = 0
    created_at: datetime
    published_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class TimetableUploadResponse(BaseModel):
    job_id: UUID
    filename: str
    sha256_digest: str
    status: str
    message: str

class PublishRequest(BaseModel):
    effective_from: Optional[date] = None
    effective_until: Optional[date] = None
