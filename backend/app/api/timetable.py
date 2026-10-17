import os
import shutil
import hashlib
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from uuid import UUID
from datetime import datetime, date

from app.core.database import get_db
from app.core.security import require_roles, get_current_user_session
from app.core.config import settings
from app.models.identity import User
from app.models.timetable import TimetableVersion, TimetableEntry, TimetableStatus
from app.models.jobs import ImportJob, JobStatus, OutboxJob
from app.models.booking import Booking, BookingLifecycleStatus, ResourceOccupancy, OccupancyEventType
from app.models.coordination import CampusMetadata
from app.models.audit import AuditLog
from app.schemas.timetable import TimetableVersionOut, TimetableUploadResponse, PublishRequest
from app.services.timetable_parser import TimetableParser

router = APIRouter(prefix="/timetable", tags=["Module D: Timetable Management"])

@router.post("/upload", response_model=TimetableUploadResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload_timetable_file(
    file: UploadFile = File(...),
    session: dict = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db)
):
    if not (file.filename.endswith(".pdf") or file.filename.endswith(".json") or file.filename.endswith(".xlsx")):
        raise HTTPException(status_code=400, detail="Only .pdf, .xlsx or canonical .json files are supported.")

    file_bytes = await file.read()
    if len(file_bytes) > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"File exceeds maximum size of {settings.MAX_UPLOAD_SIZE_MB}MB.")

    sha256 = hashlib.sha256(file_bytes).hexdigest()
    
    # Save file to uploads folder
    save_path = os.path.join(settings.UPLOAD_DIR, f"{sha256}_{file.filename}")
    with open(save_path, "wb") as f:
        f.write(file_bytes)

    # Create durable ImportJob in PostgreSQL (Producer in OS Producer-Consumer model)
    job = ImportJob(
        campus_id=settings.CAMPUS_ID,
        filename=file.filename,
        file_path=save_path,
        sha256_digest=sha256,
        status=JobStatus.QUEUED,
        progress_pct=0
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    return TimetableUploadResponse(
        job_id=job.id,
        filename=job.filename,
        sha256_digest=job.sha256_digest,
        status=job.status.value,
        message="Timetable upload accepted. Background worker process will extract table geometry and evidence."
    )

@router.get("/jobs/{job_id}")
def get_import_job_status(job_id: UUID, db: Session = Depends(get_db)):
    job = db.query(ImportJob).filter(ImportJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Import job not found.")
    return {
        "id": job.id,
        "filename": job.filename,
        "sha256_digest": job.sha256_digest,
        "status": job.status.value,
        "progress_pct": job.progress_pct,
        "error_message": job.error_message,
        "result_summary": job.result_summary,
        "created_at": job.created_at,
        "updated_at": job.updated_at
    }

@router.get("/versions", response_model=List[TimetableVersionOut])
def list_timetable_versions(db: Session = Depends(get_db)):
    versions = db.query(TimetableVersion).order_by(TimetableVersion.created_at.desc()).all()
    results = []
    for v in versions:
        count = db.query(TimetableEntry).filter(TimetableEntry.version_id == v.id).count()
        results.append(TimetableVersionOut(
            id=v.id,
            campus_id=v.campus_id,
            name=v.name,
            academic_year=v.academic_year,
            effective_from=v.effective_from,
            effective_until=v.effective_until,
            status=v.status,
            is_active=v.is_active,
            source_filename=v.source_filename,
            source_hash=v.source_hash,
            notes=v.notes,
            entry_count=count,
            created_at=v.created_at,
            published_at=v.published_at
        ))
    return results

@router.get("/versions/{version_id}/entries")
def get_version_entries(
    version_id: UUID,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    version = db.query(TimetableVersion).filter(TimetableVersion.id == version_id).first()
    if not version:
        raise HTTPException(status_code=404, detail="Version not found.")
        
    entries = db.query(TimetableEntry).filter(
        TimetableEntry.version_id == version_id
    ).order_by(TimetableEntry.day_of_week, TimetableEntry.start_time).offset(skip).limit(limit).all()

    total = db.query(TimetableEntry).filter(TimetableEntry.version_id == version_id).count()

    return {
        "version_id": version.id,
        "version_name": version.name,
        "status": version.status.value,
        "total": total,
        "skip": skip,
        "limit": limit,
        "entries": [
            {
                "id": e.id,
                "section": e.section.name if e.section else "All",
                "subject_code": e.subject.code if e.subject else "N/A",
                "subject_name": e.subject.name if e.subject else "N/A",
                "faculty_name": e.faculty.full_name if e.faculty else "Unassigned",
                "venue_name": e.venue.name if e.venue else "Unassigned",
                "building": e.venue.building if e.venue else "N/A",
                "day_of_week": e.day_of_week,
                "start_time": e.start_time.strftime("%H:%M"),
                "end_time": e.end_time.strftime("%H:%M"),
                "entry_type": e.entry_type.value,
                "source_ref": e.source_ref
            }
            for e in entries
        ]
    }

@router.post("/versions/{version_id}/preview-conflicts")
def preview_timetable_conflicts(version_id: UUID, db: Session = Depends(get_db)):
    """
    Checks for collisions between revised timetable and confirmed bookings.
    Default policy (Section 9): Do not publish a timetable that collides with a confirmed booking.
    """
    version = db.query(TimetableVersion).filter(TimetableVersion.id == version_id).first()
    if not version:
        raise HTTPException(status_code=404, detail="Version not found.")

    # Check future confirmed bookings
    today = date.today()
    bookings = db.query(Booking).filter(
        Booking.booking_date >= today,
        Booking.status == BookingLifecycleStatus.ACTIVE
    ).all()

    conflicts = []
    for b in bookings:
        dow = b.booking_date.isoweekday()
        clash_entry = db.query(TimetableEntry).filter(
            TimetableEntry.version_id == version.id,
            TimetableEntry.venue_id == b.venue_id,
            TimetableEntry.day_of_week == dow,
            TimetableEntry.start_time < b.end_time,
            TimetableEntry.end_time > b.start_time
        ).first()

        if clash_entry:
            conflicts.append({
                "booking_id": b.id,
                "venue_name": b.venue.name if b.venue else "Unknown",
                "date": str(b.booking_date),
                "booking_time": f"{b.start_time} - {b.end_time}",
                "booked_by": b.booked_by.full_name if b.booked_by else "User",
                "clash_class": clash_entry.subject.code if clash_entry.subject else "Class",
                "clash_time": f"{clash_entry.start_time} - {clash_entry.end_time}",
                "source_ref": clash_entry.source_ref
            })

    return {
        "version_id": version.id,
        "total_conflicts": len(conflicts),
        "can_publish": len(conflicts) == 0,
        "conflicts": conflicts
    }

@router.post("/versions/{version_id}/publish", response_model=TimetableVersionOut)
def publish_timetable_version(
    version_id: UUID,
    payload: Optional[PublishRequest] = None,
    session: dict = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db)
):
    """
    Section 9: Atomic Activation under exclusive campus advisory lock.
    Deactivates previous active versions, switches new version to active,
    increments schedule_rev (S), and commits audit/outbox records together.
    """
    # Take exclusive campus advisory lock
    db.execute(text("SELECT pg_advisory_xact_lock(41001, 1);"))

    version = db.query(TimetableVersion).filter(TimetableVersion.id == version_id).with_for_update().first()
    if not version:
        raise HTTPException(status_code=404, detail="Version not found.")

    if payload:
        if payload.effective_from:
            version.effective_from = payload.effective_from
        if payload.effective_until:
            version.effective_until = payload.effective_until

    # Check conflicts before publishing
    conflicts_resp = preview_timetable_conflicts(version_id, db)
    if not conflicts_resp["can_publish"]:
        raise HTTPException(
            status_code=409,
            detail=f"Publication blocked: {conflicts_resp['total_conflicts']} collisions with confirmed bookings exist. Resolve bookings first."
        )

    # Deactivate existing active versions
    db.query(TimetableVersion).filter(
        TimetableVersion.campus_id == version.campus_id,
        TimetableVersion.is_active == True,
        TimetableVersion.id != version.id
    ).update({"is_active": False, "status": TimetableStatus.ARCHIVED})

    version.is_active = True
    version.status = TimetableStatus.PUBLISHED
    version.published_at = datetime.utcnow()

    # Increment global schedule_rev (S) in campus_metadata
    meta = db.query(CampusMetadata).filter(CampusMetadata.campus_id == version.campus_id).first()
    if not meta:
        meta = CampusMetadata(campus_id=version.campus_id, schedule_rev=1, catalog_rev=1)
        db.add(meta)
    meta.schedule_rev += 1

    # Record audit log & outbox
    user_id = UUID(session["user_id"])
    audit = AuditLog(
        campus_id=version.campus_id,
        actor_user_id=user_id,
        action="PUBLISH_TIMETABLE",
        entity_type="timetable_version",
        entity_id=str(version.id),
        details={"version_name": version.name, "effective_from": str(version.effective_from)}
    )
    db.add(audit)

    outbox = OutboxJob(
        campus_id=version.campus_id,
        event_type="TIMETABLE_PUBLISHED",
        payload={"version_id": str(version.id), "schedule_rev": meta.schedule_rev}
    )
    db.add(outbox)

    db.commit()
    db.refresh(version)

    count = db.query(TimetableEntry).filter(TimetableEntry.version_id == version.id).count()
    return TimetableVersionOut(
        id=version.id,
        campus_id=version.campus_id,
        name=version.name,
        academic_year=version.academic_year,
        effective_from=version.effective_from,
        effective_until=version.effective_until,
        status=version.status,
        is_active=version.is_active,
        source_filename=version.source_filename,
        source_hash=version.source_hash,
        notes=version.notes,
        entry_count=count,
        created_at=version.created_at,
        published_at=version.published_at
    )
