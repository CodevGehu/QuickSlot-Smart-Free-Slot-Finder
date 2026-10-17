from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from uuid import UUID
from datetime import date, datetime, time

from app.core.database import get_db
from app.models.identity import User, UserRole
from app.models.timetable import TimetableVersion, TimetableEntry
from app.schemas.timetable import TeacherScheduleResponse, ScheduledClass, FreePeriod
from app.services.availability_engine import compute_free_intervals, time_to_minutes

router = APIRouter(prefix="/teachers", tags=["Module B: Teacher Venue Finder"])

DAY_NAMES = {
    1: "Monday",
    2: "Tuesday",
    3: "Wednesday",
    4: "Thursday",
    5: "Friday",
    6: "Saturday",
    7: "Sunday"
}

@router.get("/search")
def search_teachers(
    q: str = Query(..., min_length=1, description="Teacher name or faculty ID"),
    db: Session = Depends(get_db)
):
    """Searches for faculty members by name or faculty ID."""
    teachers = db.query(User).filter(
        User.role.in_([UserRole.FACULTY, UserRole.ALLOCATION_FACULTY, UserRole.ADMIN]),
        User.is_active == True,
        (User.full_name.ilike(f"%{q}%") | User.faculty_id.ilike(f"%{q}%"))
    ).limit(20).all()
    
    return [
        {
            "id": t.id,
            "faculty_id": t.faculty_id,
            "full_name": t.full_name,
            "department": t.department.name if t.department else "Computer Science & Engineering",
            "email": t.email
        }
        for t in teachers
    ]

@router.get("/{teacher_id}/schedule", response_model=TeacherScheduleResponse)
def get_teacher_schedule(
    teacher_id: UUID,
    target_date: Optional[date] = Query(None),
    day_of_week: Optional[int] = Query(None, ge=1, le=7),
    db: Session = Depends(get_db)
):
    teacher = db.query(User).filter(User.id == teacher_id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Faculty member not found.")

    query_date = target_date or date.today()
    dow = day_of_week or query_date.isoweekday()

    # Find active timetable version
    active_version = db.query(TimetableVersion).filter(
        TimetableVersion.is_active == True
    ).first()

    scheduled_classes: List[ScheduledClass] = []
    busy_spans = []

    if active_version:
        entries = db.query(TimetableEntry).filter(
            TimetableEntry.version_id == active_version.id,
            TimetableEntry.faculty_id == teacher.id,
            TimetableEntry.day_of_week == dow,
            TimetableEntry.is_active == True
        ).order_by(TimetableEntry.start_time).all()

        for ent in entries:
            sc = ScheduledClass(
                subject_code=ent.subject.code if ent.subject else "Class",
                subject_name=ent.subject.name if ent.subject else "Subject",
                section=ent.section.name if ent.section else "All",
                venue_name=ent.venue.name if ent.venue else "TBD",
                building=ent.venue.building if ent.venue else "Main Campus",
                start_time=ent.start_time.strftime("%H:%M"),
                end_time=ent.end_time.strftime("%H:%M"),
                entry_type=ent.entry_type,
                source_ref=ent.source_ref
            )
            scheduled_classes.append(sc)
            busy_spans.append((time_to_minutes(ent.start_time), time_to_minutes(ent.end_time)))

    # Compute free periods
    free_intervals_raw = compute_free_intervals(busy_spans)
    free_periods = [
        FreePeriod(
            start_time=f.start_time,
            end_time=f.end_time,
            duration_minutes=f.duration_minutes
        )
        for f in free_intervals_raw
    ]

    # Next scheduled class based on current time (if query_date is today)
    next_class = None
    if query_date == date.today():
        now_time_str = datetime.now().strftime("%H:%M")
        for sc in scheduled_classes:
            if sc.start_time > now_time_str:
                next_class = sc
                break

    return TeacherScheduleResponse(
        teacher_id=teacher.id,
        teacher_name=teacher.full_name,
        department=teacher.department.name if teacher.department else "Computer Science & Engineering",
        day_of_week=dow,
        day_name=DAY_NAMES.get(dow, "Unknown"),
        query_date=query_date,
        scheduled_classes=scheduled_classes,
        free_periods=free_periods,
        next_scheduled_class=next_class
    )
