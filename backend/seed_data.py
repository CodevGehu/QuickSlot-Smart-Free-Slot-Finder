import sys
from pathlib import Path
from datetime import date, time, datetime, timedelta
from zoneinfo import ZoneInfo

backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

from app.core.database import SessionLocal, engine, Base, ensure_extensions
from app.core.security import hash_password
from app.models.identity import User, UserRole, Department
from app.models.resources import Venue, VenueType, AllocationAssignment
from app.models.timetable import Section, Subject, TimetableVersion, TimetableEntry, TimetableStatus, TimetableEntryType
from app.models.booking import Booking, BookingRequest, BookingRequestStatus, BookingLifecycleStatus, ResourceOccupancy, OccupancyEventType
from app.models.coordination import CampusMetadata, ResourceDayState

LOCAL_TZ = ZoneInfo("Asia/Kolkata")

def seed():
    print("Initializing schema...")
    ensure_extensions()
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # 1. Campus Metadata
        meta = db.query(CampusMetadata).filter(CampusMetadata.campus_id == "main-campus-gehu").first()
        if not meta:
            meta = CampusMetadata(campus_id="main-campus-gehu", schedule_rev=1, catalog_rev=1)
            db.add(meta)
            db.flush()

        # 2. Departments
        cse_dept = db.query(Department).filter(Department.code == "CSE").first()
        if not cse_dept:
            cse_dept = Department(name="Computer Science & Engineering", code="CSE")
            db.add(cse_dept)
            db.flush()

        # 3. Users with all 4 roles
        hashed_pwd = hash_password("password123")
        
        users_data = [
            ("ADM-001", "System Administrator", "admin@gehu.ac.in", UserRole.ADMIN),
            ("FAC-101", "Prof. K.P. Nautiyal", "prof.nautiyal@gehu.ac.in", UserRole.ALLOCATION_FACULTY),
            ("FAC-102", "Dr. Ananya Sharma", "dr.sharma@gehu.ac.in", UserRole.ALLOCATION_FACULTY),
            ("FAC-103", "Dr. Rajesh Verma", "dr.verma@gehu.ac.in", UserRole.FACULTY),
            ("STU-001", "Priya Sharma (Student Club Lead)", "student@gehu.ac.in", UserRole.STUDENT),
            ("STU-002", "Rahul Mehra (ACM Vice Chair)", "rahul.mehra@gehu.ac.in", UserRole.STUDENT),
        ]

        user_map = {}
        for fid, name, email, role in users_data:
            u = db.query(User).filter(User.email == email).first()
            if not u:
                u = User(
                    faculty_id=fid,
                    full_name=name,
                    email=email,
                    password_hash=hashed_pwd,
                    role=role,
                    department_id=cse_dept.id
                )
                db.add(u)
                db.flush()
            user_map[email] = u

        # 4. Venue Types
        venue_types_data = [
            ("Classroom", "Standard academic teaching classroom"),
            ("Laboratory", "Specialized computing or engineering laboratory"),
            ("Lecture Theatre", "Tiered amphitheatre lecture hall"),
            ("Seminar Hall", "Audio-visual equipped conference and seminar hall"),
            ("Auditorium", "Large-capacity performance and event auditorium"),
            ("Open Ground", "Outdoor campus festival and sports arena"),
        ]
        type_map = {}
        for name, desc in venue_types_data:
            vt = db.query(VenueType).filter(VenueType.name == name).first()
            if not vt:
                vt = VenueType(name=name, description=desc)
                db.add(vt)
                db.flush()
            type_map[name] = vt

        # 5. Venues
        venues_data = [
            ("KP Nautiyal Auditorium", "Auditorium", "Main Building", 1, 450, ["AC", "Audio System", "Projector", "Wi-Fi", "Stage"]),
            ("New Auditorium", "Auditorium", "CS Block", 1, 600, ["AC", "Audio System", "Projector", "Stage Lighting", "Wi-Fi"]),
            ("Open Ground", "Open Ground", "Campus Green", 0, 1500, ["Floodlights", "Open Area", "Sound System"]),
            ("106 (LT)", "Lecture Theatre", "CS Block", 1, 120, ["Projector", "AC", "Audio System", "Whiteboard"]),
            ("302-A (LAB)", "Laboratory", "CS Block", 3, 40, ["Computers", "AC", "Projector", "LAN"]),
            ("102-B (LAB)", "Laboratory", "CS Block", 1, 40, ["Computers", "AC", "LAN", "Whiteboard"]),
            ("CR-017", "Classroom", "Engineering Block", 0, 60, ["Projector", "Whiteboard", "Wi-Fi"]),
            ("CR-002-A", "Classroom", "Engineering Block", 0, 60, ["Whiteboard", "Projector"]),
            ("Seminar Hall 1", "Seminar Hall", "Management Block", 2, 150, ["AC", "Projector", "Audio System", "Podium"]),
        ]
        venue_map = {}
        for name, vtype, bldg, flr, cap, feats in venues_data:
            v = db.query(Venue).filter(Venue.name == name).first()
            if not v:
                v = Venue(
                    name=name,
                    venue_type_id=type_map[vtype].id,
                    building=bldg,
                    floor=flr,
                    capacity=cap,
                    features=feats,
                    approval_required=True
                )
                db.add(v)
                db.flush()
            venue_map[name] = v

        # 6. Allocation Assignments
        # Prof. K.P. Nautiyal manages KP Nautiyal Auditorium and Open Ground
        for vname in ["KP Nautiyal Auditorium", "Open Ground"]:
            existing_ass = db.query(AllocationAssignment).filter(
                AllocationAssignment.faculty_user_id == user_map["prof.nautiyal@gehu.ac.in"].id,
                AllocationAssignment.venue_id == venue_map[vname].id
            ).first()
            if not existing_ass:
                db.add(AllocationAssignment(
                    faculty_user_id=user_map["prof.nautiyal@gehu.ac.in"].id,
                    venue_id=venue_map[vname].id
                ))

        # Dr. Ananya Sharma manages CS Block (all rooms in CS Block)
        existing_bldg_ass = db.query(AllocationAssignment).filter(
            AllocationAssignment.faculty_user_id == user_map["dr.sharma@gehu.ac.in"].id,
            AllocationAssignment.building == "CS Block"
        ).first()
        if not existing_bldg_ass:
            db.add(AllocationAssignment(
                faculty_user_id=user_map["dr.sharma@gehu.ac.in"].id,
                building="CS Block"
            ))

        # 7. Sections & Subjects
        sections = ["A1", "A2", "B1", "B2", "ML1", "DS1"]
        sec_map = {}
        for sname in sections:
            s = db.query(Section).filter(Section.name == sname).first()
            if not s:
                s = Section(name=sname, semester=5, department_id=cse_dept.id)
                db.add(s)
                db.flush()
            sec_map[sname] = s

        subjects_data = [
            ("TCS 502", "Operating Systems"),
            ("PCS 502", "Operating Systems Lab"),
            ("TCS 504", "Database Management Systems"),
            ("PCS 514", "DBMS Lab"),
            ("TCS 503", "Computer Networks"),
        ]
        sub_map = {}
        for code, name in subjects_data:
            sb = db.query(Subject).filter(Subject.code == code).first()
            if not sb:
                sb = Subject(code=code, name=name, department_id=cse_dept.id)
                db.add(sb)
                db.flush()
            sub_map[code] = sb

        # 8. Active Published Timetable Version
        tt_version = db.query(TimetableVersion).filter(TimetableVersion.is_active == True).first()
        if not tt_version:
            tt_version = TimetableVersion(
                campus_id="main-campus-gehu",
                name="B.Tech CSE V-Semester Official Timetable",
                academic_year="2026-2027",
                effective_from=date.today() - timedelta(days=90),
                effective_until=date.today() + timedelta(days=90),
                status=TimetableStatus.PUBLISHED,
                is_active=True,
                uploaded_by_user_id=user_map["admin@gehu.ac.in"].id,
                source_filename="B.Tech-C.S.E-V-TT-2-2.pdf",
                source_hash="verified_official_sha256_hash",
                notes="Verified timetable with merged lab sessions and multi-section coverage.",
                published_at=datetime.utcnow()
            )
            db.add(tt_version)
            db.flush()

            # Add entries adhering to proposal verified example:
            # A1 Tuesday PCS 502 in 302-A (LAB) from 14:10 to 16:00 (merged lab)
            # A1 Tuesday PCS 514 in 102-B (LAB) from 16:00 to 17:50 (merged lab)
            entries_data = [
                # Section A1, Tuesday
                (sec_map["A1"], sub_map["TCS 502"], user_map["dr.verma@gehu.ac.in"], venue_map["106 (LT)"], 2, time(10, 10), time(11, 5), TimetableEntryType.LECTURE, "Page 1, Col 3"),
                (sec_map["A1"], sub_map["PCS 502"], user_map["dr.verma@gehu.ac.in"], venue_map["302-A (LAB)"], 2, time(14, 10), time(16, 0), TimetableEntryType.LAB, "Page 1, Col 7-8 Merged"),
                (sec_map["A1"], sub_map["PCS 514"], user_map["dr.sharma@gehu.ac.in"], venue_map["102-B (LAB)"], 2, time(16, 0), time(17, 50), TimetableEntryType.LAB, "Page 1, Col 9-10 Merged"),
                # Section A1, Monday
                (sec_map["A1"], sub_map["TCS 504"], user_map["dr.sharma@gehu.ac.in"], venue_map["106 (LT)"], 1, time(8, 55), time(9, 50), TimetableEntryType.LECTURE, "Page 1, Col 2"),
                (sec_map["A1"], sub_map["TCS 503"], user_map["prof.nautiyal@gehu.ac.in"], venue_map["106 (LT)"], 1, time(11, 5), time(12, 0), TimetableEntryType.LECTURE, "Page 1, Col 4"),
                # Section B1, Monday
                (sec_map["B1"], sub_map["TCS 502"], user_map["dr.verma@gehu.ac.in"], venue_map["CR-017"], 1, time(10, 10), time(11, 5), TimetableEntryType.LECTURE, "Page 3, Col 3"),
                # Section ML1, Wednesday
                (sec_map["ML1"], sub_map["TCS 504"], user_map["dr.sharma@gehu.ac.in"], venue_map["106 (LT)"], 3, time(14, 10), time(15, 5), TimetableEntryType.LECTURE, "Page 14, Col 7"),
                (sec_map["ML1"], sub_map["PCS 502"], user_map["dr.verma@gehu.ac.in"], venue_map["302-A (LAB)"], 3, time(15, 5), time(17, 0), TimetableEntryType.LAB, "Page 14, Col 8-9 Merged"),
            ]

            for sec, sub, fac, ven, dow, st, et, etype, sref in entries_data:
                tent = TimetableEntry(
                    version_id=tt_version.id,
                    section_id=sec.id,
                    subject_id=sub.id,
                    faculty_id=fac.id if fac else None,
                    venue_id=ven.id,
                    day_of_week=dow,
                    start_time=st,
                    end_time=et,
                    entry_type=etype,
                    source_ref=sref
                )
                db.add(tent)

        # 9. Create a Sample Confirmed Booking and Pending Requests
        sample_date = date.today() + timedelta(days=2)
        sample_venue = venue_map["KP Nautiyal Auditorium"]
        
        existing_b = db.query(Booking).filter(
            Booking.venue_id == sample_venue.id,
            Booking.booking_date == sample_date
        ).first()

        if not existing_b:
            req = BookingRequest(
                campus_id="main-campus-gehu",
                requested_by_user_id=user_map["student@gehu.ac.in"].id,
                venue_id=sample_venue.id,
                purpose="Annual College Coding Fest Orientation",
                booking_date=sample_date,
                start_time=time(14, 0),
                end_time=time(16, 30),
                expected_attendance=300,
                required_equipment="Projector, Microphones, Audio",
                participant_group="GeekHub Student Club",
                status=BookingRequestStatus.APPROVED,
                reviewed_by_user_id=user_map["prof.nautiyal@gehu.ac.in"].id,
                reviewed_at=datetime.utcnow()
            )
            db.add(req)
            db.flush()

            b = Booking(
                campus_id="main-campus-gehu",
                request_id=req.id,
                venue_id=sample_venue.id,
                booked_by_user_id=req.requested_by_user_id,
                booking_date=sample_date,
                start_time=req.start_time,
                end_time=req.end_time,
                approved_by_user_id=user_map["prof.nautiyal@gehu.ac.in"].id,
                status=BookingLifecycleStatus.ACTIVE
            )
            db.add(b)
            db.flush()

            # Concrete occupancy row
            st_dt = datetime.combine(sample_date, req.start_time, tzinfo=LOCAL_TZ)
            et_dt = datetime.combine(sample_date, req.end_time, tzinfo=LOCAL_TZ)
            occ = ResourceOccupancy(
                campus_id="main-campus-gehu",
                resource_id=sample_venue.id,
                event_type=OccupancyEventType.BOOKING,
                booking_id=b.id,
                starts_at=st_dt,
                ends_at=et_dt,
                is_active=True
            )
            db.add(occ)

            # Sample pending request waiting in Dr. Ananya Sharma's inbox for CS Block
            pending_req = BookingRequest(
                campus_id="main-campus-gehu",
                requested_by_user_id=user_map["student@gehu.ac.in"].id,
                venue_id=venue_map["106 (LT)"].id,
                purpose="AI & ML Workshop Practice Session",
                booking_date=sample_date,
                start_time=time(11, 30),
                end_time=time(13, 0),
                expected_attendance=50,
                required_equipment="Projector, Audio System",
                participant_group="AI Student Chapter",
                status=BookingRequestStatus.PENDING
            )
            db.add(pending_req)

        db.commit()
        print("Database successfully seeded with users, venues, allocation scopes, timetable entries, and bookings!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed()
