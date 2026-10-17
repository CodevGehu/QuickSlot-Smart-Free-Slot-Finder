import sys
import os
import re
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
from app.models.booking import Booking, BookingRequest, BookingRequestStatus, BookingLifecycleStatus
from app.models.coordination import CampusMetadata
from app.services.timetable_parser import TimetableParser

PDF_PATH = os.path.join(str(backend_dir), "data", "gehu_btech_cse_v_sem_timetable.pdf")

def seed():
    print("Initializing PostgreSQL schema and extensions...")
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

        # 3. Parse Real GEHU Timetable PDF (18 pages)
        print(f"Parsing official GEHU Timetable PDF: {PDF_PATH}...")
        parsed_data = TimetableParser.parse_pdf_timetable(PDF_PATH)
        print(f"Extraction complete:")
        print(f"  • Pages: {parsed_data['page_count']}")
        print(f"  • Sections: {parsed_data['distinct_sections_count']}")
        print(f"  • Valid Sessions: {parsed_data['extracted_sessions_count']}")
        print(f"  • Merged Lab Practicals: {parsed_data['merged_labs_count']}")
        print(f"  • Distinct Venues: {parsed_data['distinct_rooms_count']}")
        print(f"  • Distinct Faculty Identified: {parsed_data['distinct_faculty_count']}")

        # 4. Standard User Accounts (Core Roles)
        hashed_pwd = hash_password("password123")
        core_users = [
            ("ADM-001", "Dr. Dean Academic", "admin@gehu.ac.in", UserRole.ADMIN),
            ("FAC-001", "Prof. K.P. Nautiyal", "prof.nautiyal@gehu.ac.in", UserRole.ALLOCATION_FACULTY),
            ("FAC-002", "Dr. Chandradeep Bhatt", "bhatt.c@gehu.ac.in", UserRole.ALLOCATION_FACULTY),
            ("FAC-003", "Dr. Aashish Garg", "garg.a@gehu.ac.in", UserRole.ALLOCATION_FACULTY),
            ("STU-001", "Rohan Sharma (Student Club Lead)", "student@gehu.ac.in", UserRole.STUDENT),
            ("STU-002", "Priya Rawat (ACM Lead)", "priya@gehu.ac.in", UserRole.STUDENT),
        ]

        user_map = {}
        for fid, name, email, role in core_users:
            u = db.query(User).filter((User.email == email) | (User.faculty_id == fid)).first()
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
            else:
                u.full_name = name
                u.email = email
                u.role = role
                db.flush()
            user_map[name] = u
            user_map[email] = u

        # 5. Populate All Real GEHU Faculty Members
        fac_counter = 10
        for f_name in parsed_data["sessions"]:
            fac_str = f_name.get("faculty_name", "").strip()
            # Split if combined e.g. "Dr. Aashish Garg / Mr. Aayush Kumar"
            for individual_faculty in fac_str.split("/"):
                fn = individual_faculty.strip()
                if not fn or fn.startswith("Through") or fn == "Faculty":
                    continue
                if fn not in user_map:
                    parts = fn.replace("Dr.", "").replace("Prof.", "").replace("Mr.", "").replace("Ms.", "").strip().lower().split()
                    email_slug = ".".join(parts) if parts else f"fac{fac_counter}"
                    fac_email = f"{email_slug}@gehu.ac.in"
                    fid = f"FAC-{fac_counter:03d}"
                    
                    u = db.query(User).filter((User.email == fac_email) | (User.faculty_id == fid)).first()
                    if not u:
                        u = User(
                            faculty_id=fid,
                            full_name=fn,
                            email=fac_email,
                            password_hash=hashed_pwd,
                            role=UserRole.FACULTY,
                            department_id=cse_dept.id
                        )
                        db.add(u)
                        db.flush()
                        fac_counter += 1
                    else:
                        u.full_name = fn
                    user_map[fn] = u
                    user_map[fac_email] = u

        # 6. Venue Types
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

        # 7. Venues Register (Extracted from Timetable + Verified Campus Facilities)
        # Determine building, floor, capacity based on venue code
        venues_to_register = []
        for vcode in parsed_data["distinct_rooms"]:
            if "(CR)" in vcode:
                vtype = "Classroom"
                cap = 60
                bldg = "CS Block"
                flr = 1
                if "017" in vcode or "002" in vcode or "009" in vcode: flr = 0
                feats = ["Whiteboard", "Projector", "Wi-Fi"]
            elif "(LT)" in vcode:
                vtype = "Lecture Theatre"
                cap = 120
                bldg = "CS Block"
                flr = int(vcode[:1]) if vcode[:1].isdigit() else 1
                feats = ["Projector", "AC", "Audio System", "Whiteboard"]
            elif "(LAB)" in vcode:
                vtype = "Laboratory"
                cap = 40
                bldg = "CS Block"
                flr = int(vcode[:1]) if vcode[:1].isdigit() and vcode[:1] != '0' else 0
                feats = ["Computers", "AC", "LAN", "Whiteboard"]
            elif "(AUDI)" in vcode:
                vtype = "Auditorium"
                cap = 350
                bldg = "CS Block"
                flr = 5
                feats = ["AC", "Audio System", "Projector", "Stage Lighting"]
            else:
                vtype = "Classroom"
                cap = 60
                bldg = "CS Block"
                flr = 1
                feats = ["Whiteboard"]

            venues_to_register.append((vcode, vtype, bldg, flr, cap, feats))

        # Add university-wide special event venues
        special_venues = [
            ("KP Nautiyal Auditorium", "Auditorium", "Main Building", 1, 450, ["AC", "Audio System", "Projector", "Wi-Fi", "Stage"]),
            ("New Auditorium", "Auditorium", "CS Block", 1, 600, ["AC", "Audio System", "Projector", "Stage Lighting", "Wi-Fi"]),
            ("Open Ground", "Open Ground", "Campus Green", 0, 1500, ["Floodlights", "Open Area", "Sound System"]),
            ("Seminar Hall 1", "Seminar Hall", "Management Block", 2, 150, ["AC", "Projector", "Audio System", "Podium"]),
        ]
        venues_to_register.extend(special_venues)

        venue_map = {}
        for name, vtype, bldg, flr, cap, feats in venues_to_register:
            v = db.query(Venue).filter(Venue.name == name).first()
            if not v:
                v = Venue(
                    name=name,
                    venue_type_id=type_map[vtype].id,
                    building=bldg,
                    floor=flr,
                    capacity=cap,
                    features=feats,
                    approval_required=True,
                    is_active=True
                )
                db.add(v)
                db.flush()
            venue_map[name] = v

        # 8. Allocation Faculty Delegation Scopes
        # Prof. K.P. Nautiyal: Manages major auditoriums and outdoor ground
        for vname in ["KP Nautiyal Auditorium", "New Auditorium", "Open Ground", "529 (AUDI)"]:
            if vname in venue_map:
                ass = db.query(AllocationAssignment).filter(
                    AllocationAssignment.faculty_user_id == user_map["Prof. K.P. Nautiyal"].id,
                    AllocationAssignment.venue_id == venue_map[vname].id
                ).first()
                if not ass:
                    db.add(AllocationAssignment(
                        faculty_user_id=user_map["Prof. K.P. Nautiyal"].id,
                        venue_id=venue_map[vname].id
                    ))

        # Dr. Chandradeep Bhatt: Scoped authority for CS Block venues
        cs_ass = db.query(AllocationAssignment).filter(
            AllocationAssignment.faculty_user_id == user_map["Dr. Chandradeep Bhatt"].id,
            AllocationAssignment.building == "CS Block"
        ).first()
        if not cs_ass:
            db.add(AllocationAssignment(
                faculty_user_id=user_map["Dr. Chandradeep Bhatt"].id,
                building="CS Block"
            ))

        # 9. Sections Register (All 18 Sections)
        sec_map = {}
        for sname in parsed_data["distinct_sections"]:
            s = db.query(Section).filter(Section.name == sname).first()
            if not s:
                s = Section(name=sname, semester=5, department_id=cse_dept.id)
                db.add(s)
                db.flush()
            sec_map[sname] = s

        # 10. Subjects Register
        # Map known codes to full names from extraction
        course_names = {
            "TCS504": "System Design",
            "TCS502": "Operating Systems",
            "TCS503": "Database Management Systems",
            "TCS514": "Computer Networks- I",
            "TCS511": "Computer Networks",
            "TCS564": "Natural Language Processing and Computer Vision",
            "TCS572": "Exploratory Data Analysis",
            "XCS501": "Career Skill- III",
            "CEC": "Career Excellence Classes",
            "TCS584": "Foundation of Quantum Computing",
            "TCS595": "Security Audit and Compliance- I",
            "TCS597(E)": "Computer System Security",
            "TCS597": "Computer System Security",
            "TCS509": "Machine Learning",
            "TCS586": "Parallel Computer Architecture",
            "PCS502": "Operating Systems Lab",
            "PCS503": "Database Management Systems Lab",
            "PCS514": "Computer Networks- I Lab",
            "PCS511": "Computer Networks Lab",
            "PCS564": "Natural Language Processing and Computer Vision Lab",
            "PCS572": "Data Science Lab- I",
            "PCS597": "Computer System Security Lab",
        }

        sub_map = {}
        for code, name in course_names.items():
            sb = db.query(Subject).filter(Subject.code == code).first()
            if not sb:
                sb = Subject(code=code, name=name, department_id=cse_dept.id)
                db.add(sb)
                db.flush()
            sub_map[code] = sb

        # 11. Published Timetable Version
        # Deactivate any previous mock versions
        db.query(TimetableVersion).filter(TimetableVersion.is_active == True).update({"is_active": False})
        db.flush()

        tt_version = TimetableVersion(
            campus_id="main-campus-gehu",
            name="B.Tech C.S.E V-Semester Official Timetable (w.e.f. 13-07-2026)",
            academic_year="2026-2027",
            effective_from=date(2026, 7, 13),
            effective_until=date(2026, 12, 31),
            status=TimetableStatus.PUBLISHED,
            is_active=True,
            uploaded_by_user_id=user_map["admin@gehu.ac.in"].id,
            source_filename="gehu_btech_cse_v_sem_timetable.pdf",
            source_hash=parsed_data["sha256_digest"],
            notes="Official GEHU Department of Computer Science & Engineering 18-Section Class Timetable.",
            published_at=datetime.now(ZoneInfo("UTC"))
        )
        db.add(tt_version)
        db.flush()

        # 12. Insert All 611 Verified Sessions
        inserted_count = 0
        for sess in parsed_data["sessions"]:
            sec_obj = sec_map.get(sess["section"])
            code_clean = sess["course_code"].replace(" ", "").upper()
            sub_obj = sub_map.get(code_clean)
            if not sub_obj:
                # auto-create if not in dict
                sub_obj = Subject(code=code_clean, name=sess["course_name"], department_id=cse_dept.id)
                db.add(sub_obj)
                db.flush()
                sub_map[code_clean] = sub_obj

            fac_str = sess.get("faculty_name", "").strip()
            # Pick first faculty user if multiple
            fac_user = None
            for f_single in fac_str.split("/"):
                fn = f_single.strip()
                if fn in user_map:
                    fac_user = user_map[fn]
                    break

            ven_obj = venue_map.get(sess["venue_name"])
            if not ven_obj:
                continue

            st_parts = [int(p) for p in sess["start_time"].split(":")]
            et_parts = [int(p) for p in sess["end_time"].split(":")]

            entry_type = TimetableEntryType.LAB if sess["entry_type"] == "LAB" else TimetableEntryType.LECTURE

            tent = TimetableEntry(
                version_id=tt_version.id,
                section_id=sec_obj.id,
                subject_id=sub_obj.id,
                faculty_id=fac_user.id if fac_user else None,
                venue_id=ven_obj.id,
                day_of_week=sess["day_of_week"],
                start_time=time(st_parts[0], st_parts[1]),
                end_time=time(et_parts[0], et_parts[1]),
                entry_type=entry_type,
                source_ref=sess["source_ref"]
            )
            db.add(tent)
            inserted_count += 1

        db.commit()
        print(f"\n=======================================================")
        print(f"DATABASE SEEDING SUCCESSFUL:")
        print(f"  • Registered Venues: {len(venue_map)}")
        print(f"  • Registered Sections: {len(sec_map)}")
        print(f"  • Registered Courses: {len(sub_map)}")
        print(f"  • Registered Faculty: {len([u for u in user_map.values() if u.role == UserRole.FACULTY])}")
        print(f"  • Verified Timetable Entries: {inserted_count}")
        print(f"  • Published Version: '{tt_version.name}'")
        print(f"=======================================================\n")

    except Exception as e:
        db.rollback()
        print(f"Error during seeding: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed()
