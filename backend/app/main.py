from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging

from app.core.config import settings
from app.core.database import ensure_extensions
from app.api.auth import router as auth_router
from app.api.availability import router as availability_router
from app.api.teachers import router as teachers_router
from app.api.requests import router as requests_router
from app.api.allocation import router as allocation_router
from app.api.timetable import router as timetable_router
from app.api.admin import router as admin_router
from app.api.os_demonstrations import router as demo_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("campus_slot_finder")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Campus Free Slot Finder backend...")
    ensure_extensions()
    yield
    logger.info("Shutting down Campus Free Slot Finder backend.")

app = FastAPI(
    title="Campus Free Slot Finder API",
    description=(
        "Full-Stack Academic Space Management and Scheduling Platform combining "
        "DBMS concepts (PostgreSQL 18, btree_gist exclusion constraints, ACID transactions, "
        "row locking, idempotency) and OS concepts (Process separation, Producer-Consumer queue, "
        "Multithreading synchronization, FCFS scheduling, Deadlock prevention)."
    ),
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(auth_router)
app.include_router(availability_router)
app.include_router(teachers_router)
app.include_router(requests_router)
app.include_router(allocation_router)
app.include_router(timetable_router)
app.include_router(admin_router)
app.include_router(demo_router)

@app.get("/health", tags=["System"])
@app.get("/api/health", tags=["System"])
def health_check():
    return {
        "status": "healthy",
        "service": "Campus Free Slot Finder API",
        "database": "PostgreSQL 18 with btree_gist",
        "cache": "Valkey / Direct DB Fallback",
        "version": "1.0.0"
    }

@app.get("/", tags=["System"])
def root():
    return {
        "message": "Welcome to Campus Free Slot Finder API",
        "docs_url": "/docs",
        "health_check": "/health"
    }
