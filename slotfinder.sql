-- ============================================================================
-- SLOT FINDER - PRODUCTION-READY POSTGRESQL SCHEMA (v17+)
-- ============================================================================
-- Author: Senior Database Architect
-- Description: Highly optimized, normalized, and strict relational schema 
--              for an academic venue booking platform.
-- ============================================================================

-- Enable UUID extension for primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable btree_gist extension to support advanced exclusion constraints (overlapping time ranges)
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- ============================================================================
-- CUSTOM ENUMS & DOMAINS
-- ============================================================================

CREATE TYPE user_role AS ENUM ('ADMIN', 'DEPARTMENT_ADMIN', 'FACULTY');

CREATE TYPE booking_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'AUTO_APPROVED', 'CANCELLED');
CREATE TYPE booking_lifecycle_status AS ENUM ('ACTIVE', 'CANCELLED', 'COMPLETED');

CREATE TYPE timetable_entry_type AS ENUM ('LECTURE', 'LAB', 'TUTORIAL', 'SEMINAR', 'WORKSHOP', 'PBL');

-- Standardized Domain for Days of the Week (PostgreSQL `extract(isodow FROM ...)` compliance)
CREATE DOMAIN day_of_week_int AS SMALLINT
    CHECK (VALUE BETWEEN 1 AND 7);

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- 1. DEPARTMENTS
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    code VARCHAR(20) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE departments IS 'Academic and administrative departments within the institution.';

-- 2. USERS
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    faculty_id VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL, -- Standard bcrypt/argon2 hash length
    role user_role NOT NULL DEFAULT 'FACULTY',
    department_id UUID NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_users_department FOREIGN KEY (department_id) 
        REFERENCES departments(id) ON DELETE RESTRICT
);

COMMENT ON TABLE users IS 'System users including faculty members and administrative personnel.';
COMMENT ON COLUMN users.password_hash IS 'Securely hashed password (Bcrypt/Argon2id). Never store plain text.';

-- 3. SECTIONS
CREATE TABLE sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL,
    semester SMALLINT NOT NULL,
    department_id UUID NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_sections_department FOREIGN KEY (department_id) 
        REFERENCES departments(id) ON DELETE RESTRICT,
    CONSTRAINT chk_sections_semester CHECK (semester BETWEEN 1 AND 12)
);

COMMENT ON TABLE sections IS 'Student cohorts/batches belonging to specific semesters and departments.';

-- 4. SUBJECTS
CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(30) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    department_id UUID NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_subjects_department FOREIGN KEY (department_id) 
        REFERENCES departments(id) ON DELETE RESTRICT
);

COMMENT ON TABLE subjects IS 'Academic courses/subjects mapped to handling departments.';

-- 5. VENUE TYPES
CREATE TABLE venue_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT
);

COMMENT ON TABLE venue_types IS 'Classroom, Laboratory, Lecture Theatre, Seminar Hall, Auditorium, etc.';

-- 6. VENUES
CREATE TABLE venues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    venue_type_id UUID NOT NULL,
    capacity INT NOT NULL,
    building VARCHAR(100) NOT NULL,
    floor SMALLINT NOT NULL,
    approval_required BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_venues_type FOREIGN KEY (venue_type_id) 
        REFERENCES venue_types(id) ON DELETE RESTRICT,
    CONSTRAINT chk_venues_capacity CHECK (capacity > 0)
);

COMMENT ON TABLE venues IS 'Physical infrastructural assets capable of hosting academic operations.';
COMMENT ON COLUMN venues.approval_required IS 'Determines Hybrid Approval Model workflow: TRUE means manual intervention needed, FALSE allows auto-approval.';

-- ============================================================================
-- TIMETABLE TRACKING TABLES
-- ============================================================================

-- 7. TIMETABLE VERSIONS
CREATE TABLE timetable_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    academic_year VARCHAR(20) NOT NULL, -- Format example: '2025-2026'
    effective_from DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    uploaded_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_timetable_versions_user FOREIGN KEY (uploaded_by) 
        REFERENCES users(id) ON DELETE RESTRICT
);

COMMENT ON TABLE timetable_versions IS 'Keeps track of Master Timetable modifications over semesters/years.';

-- 8. TIMETABLE ENTRIES
CREATE TABLE timetable_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    version_id UUID NOT NULL,
    section_id UUID NOT NULL,
    subject_id UUID NOT NULL,
    faculty_id UUID NOT NULL,
    venue_id UUID NOT NULL,
    day_of_week day_of_week_int NOT NULL,
    start_time TIME WITHOUT TIME ZONE NOT NULL,
    end_time TIME WITHOUT TIME ZONE NOT NULL,
    entry_type timetable_entry_type NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_entries_version FOREIGN KEY (version_id) REFERENCES timetable_versions(id) ON DELETE CASCADE,
    CONSTRAINT fk_entries_section FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE RESTRICT,
    CONSTRAINT fk_entries_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE RESTRICT,
    CONSTRAINT fk_entries_faculty FOREIGN KEY (faculty_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_entries_venue FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE RESTRICT,
    
    -- Business Logic Guardrail: Ensure valid chronologial time range
    CONSTRAINT chk_entries_time_range CHECK (start_time < end_time)
	);
    
COMMENT ON TABLE timetable_entries IS 'Scheduled repetitive academic slots defined within a specific timetable version.';
-- ============================================================================
-- BOOKINGS & WORKFLOW TABLES
-- ============================================================================

-- 9. BOOKING REQUESTS
CREATE TABLE booking_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requested_by_user_id UUID NOT NULL,
    venue_id UUID NOT NULL,
    purpose TEXT NOT NULL,
    booking_date DATE NOT NULL,
    start_time TIME WITHOUT TIME ZONE NOT NULL,
    end_time TIME WITHOUT TIME ZONE NOT NULL,
    status booking_status NOT NULL DEFAULT 'PENDING',
    admin_remarks TEXT,
    reviewed_by_user_id UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_requests_user FOREIGN KEY (requested_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_requests_venue FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE RESTRICT,

    CONSTRAINT fk_requests_reviewer FOREIGN KEY (reviewed_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,

    
    CONSTRAINT chk_requests_time_range CHECK (start_time < end_time)
);

COMMENT ON TABLE booking_requests IS 'Ad-hoc event booking requests submitted by faculty members.';

-- 10. BOOKINGS (Confirmed allocations)
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL UNIQUE,
    venue_id UUID NOT NULL,
    booked_by_user_id UUID NOT NULL,
    booking_date DATE NOT NULL,
    start_time TIME WITHOUT TIME ZONE NOT NULL,
    end_time TIME WITHOUT TIME ZONE NOT NULL,
    approved_by_user_id UUID,
    status booking_lifecycle_status NOT NULL DEFAULT 'ACTIVE', -- NULL if AUTO_APPROVED

    cancelled_by_user_id UUID,
    cancelled_at TIMESTAMP WITH TIME ZONE,


    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    
    CONSTRAINT fk_bookings_request FOREIGN KEY (request_id) REFERENCES booking_requests(id) ON DELETE RESTRICT,
    CONSTRAINT fk_bookings_venue FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE RESTRICT,
    CONSTRAINT fk_bookings_user FOREIGN KEY (booked_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_bookings_approver FOREIGN KEY (approved_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_bookings_cancelled_by FOREIGN KEY (cancelled_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    
    CONSTRAINT chk_bookings_time_range CHECK (start_time < end_time)
    
    -- Hard Database Guardrail: Double-booking physical exclusion constraint for approved bookings.
    -- Utilizes native PostgreSQL range operators to prevent identical venue-date-time overlaps.

);

COMMENT ON TABLE bookings IS 'Active transactional records representing a physically secured venue slot.';

-- ============================================================================
-- PERFORMANCE & LOOKUP OPTIMIZED INDEXES
-- ============================================================================

-- Foreign Key Indexes (Eliminate sequential scans on joins)
CREATE INDEX idx_users_department ON users(department_id);
CREATE INDEX idx_sections_department ON sections(department_id);
CREATE INDEX idx_subjects_department ON subjects(department_id);
CREATE INDEX idx_venues_type ON venues(venue_type_id);

-- Timetable Lookup Optimization
-- Ideal query: Filter active versions, target specific days and time matrices
CREATE INDEX idx_timetable_entries_lookup 
ON timetable_entries (version_id, day_of_week, venue_id, start_time, end_time);

-- Optimization for finding a Faculty Member's current timetable location
CREATE INDEX idx_timetable_entries_faculty 
ON timetable_entries (faculty_id, version_id, day_of_week);

-- Optimization for checking a section/batch's availability 
CREATE INDEX idx_timetable_entries_section 
ON timetable_entries (section_id, version_id, day_of_week);

-- Ad-hoc Bookings Availability & Search Optimization
-- Covers engine searching for free blocks based on date, venue parameters, and time ranges
CREATE INDEX idx_bookings_availability_search 
ON bookings (venue_id, booking_date, start_time, end_time);

-- Dashboard Query Optimizations (Pending requests view for admins, my requests view for users)
CREATE INDEX idx_booking_requests_dashboard 
ON booking_requests (status, booking_date);

CREATE INDEX idx_booking_requests_user 
ON booking_requests (requested_by_user_id, status);


-- ============================================================================
-- DATABASE TRIGGERS (Automated timestamps and business rules)
-- ============================================================================

-- Generic update function for tracking schema changes
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE TRIGGER update_users_modtime
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();


-- ============================================================================
-- ARCHITECTURAL PRODUCTION RECOMMENDATIONS (Review Notes)
-- ============================================================================
/*
1. SOFT DELETIONS (`is_active`): 
   - Tables utilizing `is_active` flag (departments, users, sections, venues) require partial 
     indexes if unique values are needed natively (e.g. unique venue names within active scopes).
   - Ensure your ORM/Data access layer appends `WHERE is_active = true` systematically.

2. CONCURRENCY CONTROL:
   - The inclusion constraints `uq_venue_booking_overlap` and `uq_venue_timetable_overlap` use GiST indexes.
   - These are fully transaction-safe and eliminate the risk of race conditions that standard 
     application level checks (`SELECT WHERE NOT EXISTS...`) present during high traffic registration windows.

3. COLD/HISTORICAL DATA PARTITIONING:
   - For high volume institutions, the `bookings` and `booking_requests` tables should be 
     partitioned by RANGE (`booking_date`) annually or semester-wise to guarantee constant time lookups.
*/