from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class FCFSJobInput(BaseModel):
    job_id: str
    arrival_time: float = Field(..., ge=0)
    burst_time: float = Field(..., gt=0)
    priority: Optional[int] = 1

class FCFSJobMetric(BaseModel):
    job_id: str
    arrival_time: float
    burst_time: float
    start_time: float
    completion_time: float
    turnaround_time: float
    waiting_time: float

class FCFSScheduleResponse(BaseModel):
    algorithm: str = "First Come, First Served (FCFS)"
    jobs: List[FCFSJobMetric]
    average_turnaround_time: float
    average_waiting_time: float
    throughput: float
    gantt_chart: List[Dict[str, Any]]

class DeadlockDemoRequest(BaseModel):
    mode: str = Field(..., description="'deadlock' to simulate circular wait, 'prevent' to use strict lock hierarchy")

class DeadlockDemoResponse(BaseModel):
    mode: str
    deadlock_occurred: bool
    coffman_conditions: Dict[str, str]
    execution_timeline: List[str]
    explanation: str

class SyncRaceDemoRequest(BaseModel):
    num_threads: int = Field(default=10, ge=2, le=50)
    increments_per_thread: int = Field(default=1000, ge=100, le=10000)
    use_mutex: bool = Field(default=False)

class SyncRaceDemoResponse(BaseModel):
    use_mutex: bool
    num_threads: int
    increments_per_thread: int
    expected_counter: int
    actual_counter: int
    lost_updates: int
    race_detected: bool
    critical_section_explanation: str

class ConcurrencyTestResponse(BaseModel):
    total_concurrent_requests: int
    confirmed_bookings: int
    rejected_conflicts: int
    exclusion_constraint_violations: int
    execution_time_seconds: float
    is_safe: bool
    verification_message: str
