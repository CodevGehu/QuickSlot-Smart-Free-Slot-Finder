import os
import sys
import time
import signal
import logging
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.core.database import SessionLocal
from app.core.config import settings
from worker.job_runner import JobRunner

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [Worker] %(message)s"
)
logger = logging.getLogger("worker")

_RUNNING = True

def handle_shutdown(signum, frame):
    global _RUNNING
    logger.info("Signal %s received. Performing graceful shutdown of background worker...", signum)
    _RUNNING = False

def run_worker():
    global _RUNNING
    signal.signal(signal.SIGINT, handle_shutdown)
    signal.signal(signal.SIGTERM, handle_shutdown)

    logger.info("Background Worker Process started. Worker PID: %d. Waiting for jobs...", os.getpid())

    while _RUNNING:
        db = SessionLocal()
        try:
            # 1. Claim and process import job
            import_job = JobRunner.claim_next_import_job(db, lease_seconds=settings.WORKER_LEASE_DURATION_SEC)
            if import_job:
                logger.info("Claimed ImportJob %s (%s). Processing...", import_job.id, import_job.filename)
                JobRunner.process_import_job(db, import_job)
                logger.info("Finished ImportJob %s. Status: %s", import_job.id, import_job.status.value)

            # 2. Claim and process transactional outbox jobs
            outbox_count = JobRunner.claim_and_process_outbox(db, lease_seconds=30)
            if outbox_count > 0:
                logger.info("Dispatched %d outbox notifications.", outbox_count)

        except Exception as e:
            logger.error("Error during worker execution cycle: %s", e)
        finally:
            db.close()

        # Sleep interval between polling cycles
        for _ in range(int(settings.WORKER_POLL_INTERVAL_SEC * 10)):
            if not _RUNNING:
                break
            time.sleep(0.1)

    logger.info("Background worker process terminated gracefully.")

if __name__ == "__main__":
    run_worker()
