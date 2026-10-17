import time
import concurrent.futures
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, time as dtime, timedelta
from uuid import uuid4

from app.core.database import get_db, SessionLocal
from app.models.identity import User, UserRole
from app.models.resources import Venue, AllocationAssignment
from app.models.booking import BookingRequest, BookingRequestStatus, BookingLifecycleStatus, Booking
from app.models.timetable import TimetableVersion
from app.schemas.os_demo import (
    FCFSJobInput, FCFSScheduleResponse,
    DeadlockDemoRequest, DeadlockDemoResponse,
    SyncRaceDemoRequest, SyncRaceDemoResponse,
    ConcurrencyTestResponse
)
from app.services.os_demo_service import OSDemoService
from app.services.booking_service import BookingService

router = APIRouter(prefix="/demo", tags=["OS & DBMS Practical Concepts"])

@router.post("/fcfs", response_model=FCFSScheduleResponse)
def simulate_fcfs_scheduling(jobs: Optional[List[FCFSJobInput]] = None):
    """
    OS Concept: CPU Scheduling & Job Ordering (FCFS)
    Section 4.E: Demonstrates First-Come First-Served scheduling,
    recording arrival time, burst time, completion time, turnaround time,
    and waiting time with Gantt chart calculation.
    """
    if not jobs:
        # Default educational preset
        jobs = [
            FCFSJobInput(job_id="P1 (Timetable Parse)", arrival_time=0.0, burst_time=4.0),
            FCFSJobInput(job_id="P2 (Cache Refill)", arrival_time=1.0, burst_time=2.0),
            FCFSJobInput(job_id="P3 (Outbox Dispatch)", arrival_time=2.0, burst_time=1.0),
            FCFSJobInput(job_id="P4 (Audit Log Flush)", arrival_time=4.0, burst_time=3.0),
            FCFSJobInput(job_id="P5 (PDF Hash Verification)", arrival_time=6.0, burst_time=2.0),
        ]
    return OSDemoService.run_fcfs_scheduling(jobs)

@router.post("/deadlock", response_model=DeadlockDemoResponse)
def simulate_deadlock(payload: DeadlockDemoRequest):
    """
    OS Concept: Deadlock & Prevention (Section 4.F)
    Demonstrates the 4 Coffman conditions:
    1. Mutual Exclusion
    2. Hold and Wait
    3. No Preemption
    4. Circular Wait
    In 'prevent' mode, enforces strict global lock hierarchy (Resource Ordering)
    to eliminate circular wait.
    """
    if payload.mode not in ["deadlock", "prevent"]:
        raise HTTPException(status_code=400, detail="Mode must be 'deadlock' or 'prevent'.")
    return OSDemoService.run_deadlock_simulation(payload.mode)

@router.post("/sync", response_model=SyncRaceDemoResponse)
def simulate_critical_section(payload: SyncRaceDemoRequest):
    """
    OS Concept: Multithreading & Synchronization (Section 4.C & 4.D)
    Demonstrates race condition on a shared counter without mutex
    versus correct mutual exclusion using threading.Lock.
    """
    return OSDemoService.run_critical_section_sync(
        num_threads=payload.num_threads,
        increments_per_thread=payload.increments_per_thread,
        use_mutex=payload.use_mutex
    )

@router.post("/concurrency-race", response_model=ConcurrencyTestResponse)
def test_concurrent_booking_race(
    num_competing: int = Query(default=20, ge=2, le=50, description="Number of competing concurrent approval threads"),
    db: Session = Depends(get_db)
):
    """
    DBMS Concept: ACID Concurrency Control & btree_gist Exclusion Constraints (Section 3.D & 12)
    Spawns multiple simultaneous threads across independent PostgreSQL database connections,
    all trying to confirm requests for the EXACT SAME room and time window.
    
    Verifies that EXACTLY ONE request confirms, and all other competing requests
    are safely rejected with 409 Conflict or exclusion violations.
    """
    # 1. Pick or setup an eligible test venue and faculty
    venue = db.query(Venue).filter(Venue.is_active == True).first()
    allocator = db.query(User).filter(User.role == UserRole.ALLOCATION_FACULTY).first()
    if not allocator:
        allocator = db.query(User).filter(User.role == UserRole.ADMIN).first()
    student = db.query(User).filter(User.role == UserRole.STUDENT).first()

    if not venue or not allocator or not student:
        raise HTTPException(status_code=400, detail="Database requires seeded venues and users to run race test.")

    # Ensure allocator has scope for this venue
    assignment = db.query(AllocationAssignment).filter(
        AllocationAssignment.faculty_user_id == allocator.id,
        AllocationAssignment.venue_id == venue.id
    ).first()
    if not assignment:
        assignment = AllocationAssignment(
            faculty_user_id=allocator.id,
            venue_id=venue.id
        )
        db.add(assignment)
        db.commit()

    # Ensure an active timetable version exists
    active_version = db.query(TimetableVersion).filter(TimetableVersion.is_active == True).first()
    if not active_version:
        active_version = TimetableVersion(
            campus_id=venue.campus_id,
            name="Pilot Schedule 2026",
            academic_year="2026-2027",
            effective_from=date.today() - timedelta(days=30),
            is_active=True,
            uploaded_by_user_id=allocator.id
        )
        db.add(active_version)
        db.commit()

    # Target test slot: future date at 18:00 - 19:00 (outside normal classes)
    test_date = date.today() + timedelta(days=14)
    test_start = dtime(18, 0)
    test_end = dtime(19, 0)

    # Clean up any existing bookings for this test slot
    db.query(Booking).filter(
        Booking.venue_id == venue.id,
        Booking.booking_date == test_date,
        Booking.start_time == test_start
    ).delete()
    db.commit()

    # Create N competing pending requests for the same room and time
    created_request_ids = []
    for i in range(num_competing):
        req = BookingRequest(
            campus_id=venue.campus_id,
            requested_by_user_id=student.id,
            venue_id=venue.id,
            purpose=f"Concurrent Test Contender #{i+1}",
            booking_date=test_date,
            start_time=test_start,
            end_time=test_end,
            expected_attendance=10,
            status=BookingRequestStatus.PENDING
        )
        db.add(req)
        db.flush()
        created_request_ids.append(req.id)
    db.commit()

    confirmed_count = 0
    conflict_count = 0
    exclusion_violations = 0

    start_time = time.time()

    # Worker function that runs in its own thread with its own independent DB session
    def attempt_approval(request_id):
        nonlocal confirmed_count, conflict_count, exclusion_violations
        worker_db = SessionLocal()
        try:
            worker_allocator = worker_db.query(User).filter(User.id == allocator.id).one()
            BookingService.approve_request(
                db=worker_db,
                approver=worker_allocator,
                request_id=request_id
            )
            confirmed_count += 1
        except HTTPException as he:
            conflict_count += 1
            if "exclusion constraint" in str(he.detail).lower():
                exclusion_violations += 1
        except Exception:
            conflict_count += 1
        finally:
            worker_db.close()

    # Launch competing threads simultaneously using ThreadPoolExecutor
    with concurrent.futures.ThreadPoolExecutor(max_workers=num_competing) as executor:
        futures = [executor.submit(attempt_approval, r_id) for r_id in created_request_ids]
        concurrent.futures.wait(futures)

    elapsed = round(time.time() - start_time, 3)
    is_safe = (confirmed_count == 1)

    verification_msg = (
        f"SUCCESS: Out of {num_competing} concurrent approval attempts targeting the same slot, "
        f"exactly {confirmed_count} reservation was confirmed and {conflict_count} were rejected! "
        f"Database row locks and PostgreSQL btree_gist exclusion constraints prevented double-booking."
        if is_safe else
        f"FAILURE: {confirmed_count} bookings confirmed! Concurrency control violated."
    )

    return ConcurrencyTestResponse(
        total_concurrent_requests=num_competing,
        confirmed_bookings=confirmed_count,
        rejected_conflicts=conflict_count,
        exclusion_constraint_violations=exclusion_violations,
        execution_time_seconds=elapsed,
        is_safe=is_safe,
        verification_message=verification_msg
    )
