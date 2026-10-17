from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from typing import Generator
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

# Engine configuration with timeouts as specified in Section 7 of Proposal
# lock_timeout 2000ms, statement_timeout 8000ms
engine = create_engine(
    settings.DATABASE_URL,
    pool_size=20,
    max_overflow=30,
    pool_timeout=10,
    pool_pre_ping=True,
    connect_args={
        "options": "-c lock_timeout=2000ms -c statement_timeout=8000ms"
    }
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def ensure_extensions():
    """Ensure required extensions uuid-ossp and btree_gist are enabled."""
    with engine.begin() as conn:
        conn.execute(text('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'))
        conn.execute(text('CREATE EXTENSION IF NOT EXISTS "btree_gist";'))
        logger.info("PostgreSQL extensions verified: uuid-ossp, btree_gist")
