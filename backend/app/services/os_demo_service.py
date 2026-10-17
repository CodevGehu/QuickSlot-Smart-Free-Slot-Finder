import time
import threading
import concurrent.futures
from typing import List, Dict, Any, Tuple
from app.schemas.os_demo import (
    FCFSJobInput, FCFSJobMetric, FCFSScheduleResponse,
    DeadlockDemoResponse, SyncRaceDemoResponse, ConcurrencyTestResponse
)

# Shared in-memory state for Critical Section demonstration
_DEMO_COUNTER = 0
_DEMO_LOCK = threading.Lock()

class OSDemoService:
    @staticmethod
    def run_fcfs_scheduling(jobs_input: List[FCFSJobInput]) -> FCFSScheduleResponse:
        """
        Simulates First Come, First Served (FCFS) CPU Scheduling.
        Computes CT, TAT, WT, and Gantt chart.
        """
        if not jobs_input:
            return FCFSScheduleResponse(
                jobs=[],
                average_turnaround_time=0.0,
                average_waiting_time=0.0,
                throughput=0.0,
                gantt_chart=[]
            )

        # Sort jobs strictly by arrival time
        sorted_jobs = sorted(jobs_input, key=lambda x: x.arrival_time)
        
        current_time = 0.0
        gantt_chart = []
        metrics: List[FCFSJobMetric] = []
        
        total_tat = 0.0
        total_wt = 0.0

        for job in sorted_jobs:
            # Handle CPU idle time if job arrives after current_time
            if current_time < job.arrival_time:
                gantt_chart.append({
                    "job_id": "IDLE",
                    "start": round(current_time, 2),
                    "end": round(job.arrival_time, 2),
                    "duration": round(job.arrival_time - current_time, 2),
                    "is_idle": True
                })
                current_time = job.arrival_time

            start_time = current_time
            completion_time = start_time + job.burst_time
            turnaround_time = completion_time - job.arrival_time
            waiting_time = turnaround_time - job.burst_time

            gantt_chart.append({
                "job_id": job.job_id,
                "start": round(start_time, 2),
                "end": round(completion_time, 2),
                "duration": round(job.burst_time, 2),
                "is_idle": False
            })

            metrics.append(FCFSJobMetric(
                job_id=job.job_id,
                arrival_time=round(job.arrival_time, 2),
                burst_time=round(job.burst_time, 2),
                start_time=round(start_time, 2),
                completion_time=round(completion_time, 2),
                turnaround_time=round(turnaround_time, 2),
                waiting_time=round(waiting_time, 2)
            ))

            total_tat += turnaround_time
            total_wt += waiting_time
            current_time = completion_time

        n = len(sorted_jobs)
        avg_tat = round(total_tat / n, 2)
        avg_wt = round(total_wt / n, 2)
        total_time = current_time if current_time > 0 else 1.0
        throughput = round(n / total_time, 4)

        return FCFSScheduleResponse(
            jobs=metrics,
            average_turnaround_time=avg_tat,
            average_waiting_time=avg_wt,
            throughput=throughput,
            gantt_chart=gantt_chart
        )

    @staticmethod
    def run_deadlock_simulation(mode: str) -> DeadlockDemoResponse:
        """
        Isolated educational demonstration of Deadlock & Prevention (Coffman conditions).
        Uses 2 locks and 2 threads with timeout to avoid freezing the system.
        """
        lock_A = threading.Lock()
        lock_B = threading.Lock()
        timeline: List[str] = []
        timeline_lock = threading.Lock()

        def log_event(msg: str):
            with timeline_lock:
                timeline.append(f"[{time.strftime('%H:%M:%S')}] {msg}")

        deadlock_detected = False

        if mode == "deadlock":
            # Simulate Coffman Conditions: Circular Wait
            # Thread 1: Acquire A -> Hold A -> Try to acquire B
            # Thread 2: Acquire B -> Hold B -> Try to acquire A
            def thread_1_work():
                log_event("Thread 1: Attempting to acquire Resource A...")
                lock_A.acquire()
                log_event("Thread 1: Acquired Resource A. Holding Resource A and sleeping 150ms...")
                time.sleep(0.15)
                log_event("Thread 1: Attempting to acquire Resource B (while holding A)...")
                acquired = lock_B.acquire(timeout=0.6)
                if not acquired:
                    log_event("Thread 1: TIMEOUT! Could not acquire Resource B. Deadlock / Circular wait detected!")
                else:
                    log_event("Thread 1: Acquired Resource B.")
                    lock_B.release()
                lock_A.release()
                log_event("Thread 1: Released Resource A.")

            def thread_2_work():
                log_event("Thread 2: Attempting to acquire Resource B...")
                lock_B.acquire()
                log_event("Thread 2: Acquired Resource B. Holding Resource B and sleeping 150ms...")
                time.sleep(0.15)
                log_event("Thread 2: Attempting to acquire Resource A (while holding B)...")
                acquired = lock_A.acquire(timeout=0.6)
                if not acquired:
                    log_event("Thread 2: TIMEOUT! Could not acquire Resource A. Deadlock / Circular wait detected!")
                else:
                    log_event("Thread 2: Acquired Resource A.")
                    lock_A.release()
                lock_B.release()
                log_event("Thread 2: Released Resource B.")

            t1 = threading.Thread(target=thread_1_work)
            t2 = threading.Thread(target=thread_2_work)
            t1.start()
            t2.start()
            t1.join()
            t2.join()

            deadlock_detected = True
            explanation = (
                "Deadlock occurred because all 4 Coffman conditions were met: "
                "1) Mutual Exclusion: Resources A and B cannot be shared. "
                "2) Hold and Wait: Thread 1 holds A and waits for B, while Thread 2 holds B and waits for A. "
                "3) No Preemption: Neither thread can forcibly seize a resource held by another. "
                "4) Circular Wait: Thread 1 -> Resource B -> Thread 2 -> Resource A -> Thread 1. "
                "The demonstration detected this condition safely using a controlled lock timeout."
            )

        else:
            # Deadlock Prevention via Global Lock Hierarchy (Resource Ordering)
            # Rule: All threads MUST acquire locks in consistent ascending order (Resource A, then Resource B).
            def safe_thread_1():
                log_event("Safe Thread 1: Acquiring Resource A (hierarchy order 1)...")
                with lock_A:
                    log_event("Safe Thread 1: Acquired A. Now acquiring Resource B (hierarchy order 2)...")
                    with lock_B:
                        log_event("Safe Thread 1: Acquired both A and B. Processing critical section safely...")
                        time.sleep(0.1)
                log_event("Safe Thread 1: Released both resources successfully.")

            def safe_thread_2():
                log_event("Safe Thread 2: Acquiring Resource A (hierarchy order 1 - obeys ordering)...")
                with lock_A:
                    log_event("Safe Thread 2: Acquired A. Now acquiring Resource B (hierarchy order 2)...")
                    with lock_B:
                        log_event("Safe Thread 2: Acquired both A and B. Processing critical section safely...")
                        time.sleep(0.1)
                log_event("Safe Thread 2: Released both resources successfully.")

            t1 = threading.Thread(target=safe_thread_1)
            t2 = threading.Thread(target=safe_thread_2)
            t1.start()
            t2.start()
            t1.join()
            t2.join()

            deadlock_detected = False
            explanation = (
                "Deadlock was completely PREVENTED by enforcing a Global Resource Ordering Hierarchy (Resource A < Resource B). "
                "Because both threads acquire Resource A before Resource B, Circular Wait is mathematically impossible! "
                "This is the exact same design pattern used in our database booking transactions: "
                "locking resource_day_state rows in sorted ascending key order."
            )

        coffman_conditions = {
            "Mutual Exclusion": "Resources A and B are non-shareable exclusive locks.",
            "Hold and Wait": "Processes hold currently allocated resources while waiting for additional resources.",
            "No Preemption": "A resource cannot be forcibly preempted from a holding thread.",
            "Circular Wait": "A closed chain of threads exists such that each thread holds at least one resource needed by the next."
        }

        return DeadlockDemoResponse(
            mode=mode,
            deadlock_occurred=deadlock_detected,
            coffman_conditions=coffman_conditions,
            execution_timeline=timeline,
            explanation=explanation
        )

    @staticmethod
    def run_critical_section_sync(num_threads: int, increments_per_thread: int, use_mutex: bool) -> SyncRaceDemoResponse:
        """
        Demonstrates Multithreading, Critical Sections, and Race Conditions.
        Shows lost updates without synchronization vs correct value with Mutex.
        """
        counter = 0

        if use_mutex:
            mutex = threading.Lock()
            def worker_with_lock():
                nonlocal counter
                for _ in range(increments_per_thread):
                    with mutex:
                        counter += 1

            threads = [threading.Thread(target=worker_with_lock) for _ in range(num_threads)]
            for t in threads:
                t.start()
            for t in threads:
                t.join()
        else:
            # Without lock: deliberate small yield to induce context switching during load-increment-store
            def worker_without_lock():
                nonlocal counter
                for _ in range(increments_per_thread):
                    temp = counter
                    # Artificially induce context switch vulnerability
                    time.sleep(0.000001)
                    counter = temp + 1

            threads = [threading.Thread(target=worker_without_lock) for _ in range(num_threads)]
            for t in threads:
                t.start()
            for t in threads:
                t.join()

        expected = num_threads * increments_per_thread
        lost = max(0, expected - counter)
        race_detected = (lost > 0)

        explanation = (
            f"Expected {expected} increments ({num_threads} threads × {increments_per_thread} iterations). "
            + (
                f"With Mutual Exclusion (threading.Lock), every increment executed atomically inside the critical section. No updates were lost."
                if use_mutex else
                f"Without synchronization, multiple threads interleaved the non-atomic operation (read counter -> modify -> store counter). "
                f"Result: {lost} updates were lost due to race conditions!"
            )
        )

        return SyncRaceDemoResponse(
            use_mutex=use_mutex,
            num_threads=num_threads,
            increments_per_thread=increments_per_thread,
            expected_counter=expected,
            actual_counter=counter,
            lost_updates=lost,
            race_detected=race_detected,
            critical_section_explanation=explanation
        )
