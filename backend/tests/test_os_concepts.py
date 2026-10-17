import pytest
from datetime import datetime, timedelta
from app.schemas.os_demo import FCFSJobInput
from app.services.os_demo_service import OSDemoService
from app.models.jobs import ImportJob, JobStatus
from worker.job_runner import JobRunner

def test_fcfs_scheduling_calculations():
    # Known test dataset:
    # Job 1: Arrival 0, Burst 4 -> Start 0, CT 4, TAT 4-0=4, WT 4-4=0
    # Job 2: Arrival 1, Burst 3 -> Start 4, CT 7, TAT 7-1=6, WT 6-3=3
    # Job 3: Arrival 2, Burst 1 -> Start 7, CT 8, TAT 8-2=6, WT 6-1=5
    jobs = [
        FCFSJobInput(job_id="P1", arrival_time=0.0, burst_time=4.0),
        FCFSJobInput(job_id="P2", arrival_time=1.0, burst_time=3.0),
        FCFSJobInput(job_id="P3", arrival_time=2.0, burst_time=1.0),
    ]
    result = OSDemoService.run_fcfs_scheduling(jobs)

    assert len(result.jobs) == 3
    p1 = next(j for j in result.jobs if j.job_id == "P1")
    p2 = next(j for j in result.jobs if j.job_id == "P2")
    p3 = next(j for j in result.jobs if j.job_id == "P3")

    assert p1.completion_time == 4.0
    assert p1.waiting_time == 0.0

    assert p2.completion_time == 7.0
    assert p2.waiting_time == 3.0

    assert p3.completion_time == 8.0
    assert p3.waiting_time == 5.0

    # Average TAT = (4 + 6 + 6) / 3 = 16 / 3 = 5.33
    assert result.average_turnaround_time == 5.33
    # Average WT = (0 + 3 + 5) / 3 = 8 / 3 = 2.67
    assert result.average_waiting_time == 2.67

def test_deadlock_detection_and_prevention():
    # 1. Deadlock mode: should detect circular wait safely via timeout
    deadlock_res = OSDemoService.run_deadlock_simulation("deadlock")
    assert deadlock_res.deadlock_occurred is True
    assert len(deadlock_res.coffman_conditions) == 4
    assert any("TIMEOU" in log or "Deadlock" in log for log in deadlock_res.execution_timeline)

    # 2. Prevent mode: lock hierarchy eliminates circular wait
    prevent_res = OSDemoService.run_deadlock_simulation("prevent")
    assert prevent_res.deadlock_occurred is False
    assert any("hierarchy order" in log for log in prevent_res.execution_timeline)

def test_critical_section_race_condition_vs_mutex():
    # With mutex: exactly 20 * 200 = 4000
    safe_res = OSDemoService.run_critical_section_sync(num_threads=10, increments_per_thread=200, use_mutex=True)
    assert safe_res.actual_counter == safe_res.expected_counter
    assert safe_res.lost_updates == 0
    assert safe_res.race_detected is False

def test_producer_consumer_worker_lease_recovery(db_session):
    from datetime import timezone
    # Clean any stale test jobs
    db_session.query(ImportJob).delete()
    db_session.commit()

    # Simulate a crashed worker with an expired lease
    past_time = datetime.now(timezone.utc) - timedelta(minutes=5)
    expired_job = ImportJob(
        campus_id="main-campus-gehu",
        filename="test_crash.pdf",
        file_path="/tmp/test_crash.pdf",
        sha256_digest="deadbeef",
        status=JobStatus.PROCESSING,
        worker_id="crashed-worker-pid-9999",
        lease_expires_at=past_time
    )
    db_session.add(expired_job)
    db_session.commit()

    # The alive consumer must claim and recover this abandoned job
    claimed_job = JobRunner.claim_next_import_job(db_session, lease_seconds=60)
    assert claimed_job is not None
    assert claimed_job.id == expired_job.id
    assert claimed_job.worker_id != "crashed-worker-pid-9999"
    assert claimed_job.lease_expires_at > datetime.now(timezone.utc)

    # Clean up
    db_session.delete(claimed_job)
    db_session.commit()
