import sys
import os
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

from app.core.database import engine, Base, ensure_extensions
import app.models  # Load all models

def main():
    print("Connecting to PostgreSQL 18 and ensuring extensions...")
    ensure_extensions()
    print("Creating all tables in PostgreSQL 18...")
    Base.metadata.create_all(bind=engine)
    print("Database tables successfully initialized with btree_gist exclusion constraints!")

if __name__ == "__main__":
    main()
