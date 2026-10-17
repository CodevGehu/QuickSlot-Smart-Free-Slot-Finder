import os
import sys
import time
import socket
from datetime import datetime, timedelta, timezone
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from app.core.database import SessionLocal
from app.models.jobs import ImportJob, OutboxJob, JobStatus, OutboxStatus
from app.models.timetable import TimetableVersion, TimetableEntry, TimetableStatus, Section, Subject, TimetableEntryType
from app.models.resources import Venue
from app.models.identity import User
from app.services.timetable_parser import TimetableParser

WORKER_ID = f"worker-{socket.gethostname()}-{os.getpid()}"

class JobRunner:
    @staticmethod
    def claim_next_import_job(db: Session, lease_seconds: int = 60) -> Optional[ImportJob]:
        """
        OS Producer-Consumer Concept:
        Atomically claims an available job or an abandoned job whose worker lease expired.
        """
        now = datetime.now(timezone.utc)
        lease_expiry = now + timedelta(seconds=lease_seconds)

        job = db.query(ImportJob).filter(
            or_(
                ImportJob.status == JobStatus.QUEUED,
                and_(ImportJob.status == JobStatus.PROCESSING, ImportJob.lease_expires_at < now)
            )
        ).with_for_update(skip_locked=True).first()

        if job:
            job.status = JobStatus.PROCESSING
            job.worker_id = WORKER_ID
            job.lease_expires_at = lease_expiry
            job.retry_count += 1
            job.updated_at = now
            db.commit()
            db.refresh(job)
            return job
        return None

    @staticmethod
    def process_import_job(db: Session, job: ImportJob):
        """Processes PDF timetable import and creates draft TimetableVersion."""
        try:
            job.progress_pct = 20
            db.commit()

            if not os.path.exists(job.file_path):
                raise FileNotFoundError(f"File not found on disk: {job.file_path}")

            # Extract table geometry and text using pdfplumber
            parsed_data = TimetableParser.parse_pdf_timetable(job.file_path)
            job.progress_pct = 60
            db.commit()

            admin_user = db.query(User).filter(User.role == "ADMIN").first()
            admin_id = admin_user.id if admin_user else None

            # Create Draft Timetable Version (Section 9: Uploading never mutates active schedule)
            draft_version = TimetableVersion(
                campus_id=job.campus_id,
                name=f"Draft Schedule ({job.filename})",
                academic_year="2026-2027",
                effective_from=datetime.utcnow().date(),
                status=TimetableStatus.DRAFT,
                is_active=False,
                uploaded_by_user_id=admin_id,
                source_filename=job.filename,
                source_hash=job.sha256_digest,
                notes=f"Extracted {parsed_data['extracted_sessions_count']} candidate sessions with {parsed_data['merged_labs_count']} merged lab intervals."
            )
            db.add(draft_version)
            db.flush()

            # Map and insert entries
            inserted_count = 0
            for sess in parsed_data.get("sessions", []):
                # Resolve or find Section
                sec = db.query(Section).filter(Section.name.ilike(sess["section"])).first()
                if not sec:
                    default_dept = admin_user.department_id if admin_user else None
                    sec = Section(name=sess["section"], semester=5, department_id=default_dept)
                    db.add(sec)
                    db.flush()

                # Resolve or find Subject
                sub = db.query(Subject).filter(Subject.code.ilike(sess["course_code"])).first()
                if not sub:
                    sub = Subject(code=sess["course_code"], name=sess["course_code"], department_id=sec.department_id)
                    db.add(sub)
                    db.flush()

                # Resolve Venue candidate
                v_name = sess["room_candidate"]
                venue = db.query(Venue).filter(Venue.name.ilike(f"%{v_name}%")).first()
                if not venue:
                    # Map to a fallback active venue or create placeholder
                    venue = db.query(Venue).first()

                if venue:
                    s_time = datetime.strptime(sess["start_time"], "%H:%M").time()
                    e_time = datetime.strptime(sess["end_time"], "%H:%M").time()
                    e_type = TimetableEntryType.LAB if sess["entry_type"] == "LAB" else TimetableEntryType.LECTURE

                    entry = TimetableEntry(
                        version_id=draft_version.id,
                        section_id=sec.id,
                        subject_id=sub.id,
                        venue_id=venue.id,
                        day_of_week=sess["day_of_week"],
                        start_time=s_time,
                        end_time=e_time,
                        entry_type=e_type,
                        source_ref=sess["source_ref"]
                    )
                    db.add(entry)
                    inserted_count += 1

            job.progress_pct = 100
            job.status = JobStatus.COMPLETED
            job.result_summary = {
                "version_id": str(draft_version.id),
                "extracted_sessions": parsed_data["extracted_sessions_count"],
                "inserted_entries": inserted_count,
                "merged_labs": parsed_data["merged_labs_count"],
                "distinct_rooms": parsed_data["distinct_rooms"],
                "review_issues": parsed_data["review_issues"]
            }
            db.commit()

        except Exception as e:
            db.rollback()
            job.status = JobStatus.FAILED
            job.error_message = str(e)
            db.commit()

    @staticmethod
    def claim_and_process_outbox(db: Session, lease_seconds: int = 30) -> int:
        """Processes transactional outbox notifications."""
        now = datetime.utcnow()
        outbox_items = db.query(OutboxJob).filter(
            or_(
                OutboxJob.status == OutboxStatus.PENDING,
                and_(OutboxJob.status == OutboxStatus.PROCESSING, OutboxJob.lease_expires_at < now)
            )
        ).with_for_update(skip_locked=True).limit(10).all()

        processed = 0
        for item in outbox_items:
            item.status = OutboxStatus.PROCESSING
            item.worker_id = WORKER_ID
            item.lease_expires_at = now + timedelta(seconds=lease_seconds)
            db.commit()

            # Simulate dispatch (e.g. log, in-app notification emission)
            item.status = OutboxStatus.SENT
            item.processed_at = datetime.utcnow()
            db.commit()
            processed += 1
        return processed
