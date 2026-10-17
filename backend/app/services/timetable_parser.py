import re
import hashlib
from typing import List, Dict, Any, Optional
from pathlib import Path
import pdfplumber

# Standard Period Times (GEHU timetable layout)
PERIOD_SLOTS = [
    (1, "08:00", "08:55"),
    (2, "08:55", "09:50"),
    (3, "10:10", "11:05"),
    (4, "11:05", "12:00"),
    (5, "12:00", "12:55"),
    (6, "12:55", "13:50"),
    (7, "14:10", "15:05"),
    (8, "15:05", "16:00"),
    (9, "16:00", "16:55"),
    (10, "16:55", "17:50"),
]

DAYS_MAP = {
    "MON": 1,
    "TUE": 2,
    "WED": 3,
    "THU": 4,
    "FRI": 5
}

ROOM_PAT = re.compile(r'(\d+[-A-Z0-9]*\s*\((?:CR|LT|LAB|AUDI)\))', re.IGNORECASE)
COURSE_PAT = re.compile(r'([A-Z]{3}\s*\d{3}[A-Z]?(?:\([A-Z]\))?)', re.IGNORECASE)

class TimetableParser:
    @staticmethod
    def calculate_file_hash(file_path: str) -> str:
        h = hashlib.sha256()
        with open(file_path, "rb") as f:
            while chunk := f.read(65536):
                h.update(chunk)
        return h.hexdigest()

    @classmethod
    def parse_pdf_timetable(cls, pdf_path: str) -> Dict[str, Any]:
        """
        Parses all sections of the GEHU timetable PDF.
        Extracts sections, subject-faculty mappings, elective rooms, merged 2-period lab practicals,
        and regular lecture allocations.
        """
        sha256 = cls.calculate_file_hash(pdf_path)
        all_entries = []
        all_venues = set()
        all_courses = {}
        all_faculty = set()
        sections_found = []
        review_issues = []
        total_cells_processed = 0
        merged_labs_count = 0

        with pdfplumber.open(pdf_path) as pdf:
            page_count = len(pdf.pages)
            for page_idx, page in enumerate(pdf.pages):
                page_num = page_idx + 1
                text = page.extract_text() or ""
                
                sec_m = re.search(r"Section:\s*([A-Za-z0-9]+)", text)
                sec_name = sec_m.group(1).upper() if sec_m else f"SEC-{page_num}"
                sections_found.append(sec_name)

                coord_m = re.search(r"CLASS CO-ORDINATOR:\s*(.+)", text)
                coord_name = coord_m.group(1).strip() if coord_m else ""

                tables = page.extract_tables()
                if not tables:
                    review_issues.append({
                        "page": page_num,
                        "type": "NO_TABLE_FOUND",
                        "message": f"Page {page_num} has no detectable table lines."
                    })
                    continue

                grid = tables[0]
                mapping_tables = [t for t in tables[1:] if len(t) > 6]
                sec_sub_faculty = {}
                sec_electives = {}

                # 1. Parse Subject-Faculty mapping table (bottom of page)
                if mapping_tables:
                    map_tbl = mapping_tables[0]
                    for row in map_tbl:
                        clean = [str(c).replace('\n', ' ').strip() for c in row if c and str(c).strip()]
                        if len(clean) >= 3 and clean[0] not in ['SUBJECT CODE', 'ELECTIVE', 'LABS']:
                            clean_code = clean[0].replace(' ', '').upper()
                            s_name = clean[1]
                            f_name = clean[2]

                            # Check if faculty string contains designated room (common for electives)
                            room_in_fac = ROOM_PAT.search(f_name)
                            if room_in_fac:
                                e_room = re.sub(r'\s+', ' ', room_in_fac.group(1).strip())
                                all_venues.add(e_room)
                                f_clean = f_name.replace(room_in_fac.group(0), '').strip().rstrip('()').strip()
                                sec_electives[clean_code] = {
                                    'code': clean_code,
                                    'name': s_name,
                                    'faculty': f_clean,
                                    'room': e_room
                                }
                                all_faculty.add(f_clean)
                            else:
                                sec_sub_faculty[clean_code] = {
                                    'code': clean_code,
                                    'name': s_name,
                                    'faculty': f_name
                                }
                                for f_single in f_name.split('/'):
                                    fs = f_single.strip()
                                    if fs and not fs.startswith("Through"):
                                        all_faculty.add(fs)

                            all_courses[clean_code] = s_name

                # 2. Parse Timetable Grid Rows 1-5 (MON to FRI)
                for row_idx, row in enumerate(grid[1:]):
                    day_str = row[0].replace('\n', ' ').strip().upper() if row[0] else ''
                    if day_str not in DAYS_MAP:
                        continue
                    day_num = DAYS_MAP[day_str]

                    col_idx = 0
                    while col_idx < 10:
                        cell_val = row[col_idx + 1] if col_idx + 1 < len(row) else None
                        total_cells_processed += 1

                        if not cell_val or cell_val.strip() in ['-', '']:
                            col_idx += 1
                            continue

                        cell_clean = cell_val.replace('\n', ' ').strip()

                        # Detect merged 2-period lab practicals
                        is_merged = False
                        next_val = row[col_idx + 2] if col_idx + 2 < len(row) else 'END'
                        if (next_val is None or next_val.strip() == '') and ('LAB' in cell_clean.upper() or 'PCS' in cell_clean.upper()):
                            is_merged = True
                            merged_labs_count += 1

                        slot_start = PERIOD_SLOTS[col_idx][1]
                        if is_merged and col_idx + 1 < len(PERIOD_SLOTS):
                            slot_end = PERIOD_SLOTS[col_idx + 1][2]
                        else:
                            slot_end = PERIOD_SLOTS[col_idx][2]

                        # A. Handle Elective block: Students disperse into elective rooms
                        if 'ELECTIVE' in cell_clean.upper():
                            for e_code, e_info in sec_electives.items():
                                all_entries.append({
                                    'session_id': f"sess-p{page_num}-d{day_num}-{e_code}-{slot_start.replace(':', '')}",
                                    'section': sec_name,
                                    'day_of_week': day_num,
                                    'start_time': slot_start,
                                    'end_time': slot_end,
                                    'course_code': e_code,
                                    'course_name': e_info['name'],
                                    'faculty_name': e_info['faculty'],
                                    'venue_name': e_info['room'],
                                    'entry_type': 'LECTURE',
                                    'is_merged': False,
                                    'source_ref': f'Page {page_num} {sec_name} {day_str} Col {col_idx+1}'
                                })
                            col_idx += (2 if is_merged else 1)
                            continue

                        # B. Extract Venue
                        room_m = ROOM_PAT.search(cell_clean)
                        venue_name = re.sub(r'\s+', ' ', room_m.group(1).strip()) if room_m else None
                        if venue_name:
                            all_venues.add(venue_name)

                        # C. Extract Course Code
                        course_m = COURSE_PAT.search(cell_clean)
                        c_code = course_m.group(1).replace(' ', '').upper() if course_m else 'UNRESOLVED'

                        # D. Resolve Faculty & Course Name
                        c_info = sec_sub_faculty.get(c_code) or sec_electives.get(c_code)
                        fac_name = c_info['faculty'] if c_info else "Faculty"
                        c_name = c_info['name'] if c_info else c_code

                        # Handle Career Skills (XCS 501) initials
                        if 'XCS' in c_code:
                            ini_m = re.search(r'\(([A-Z]{2})\)', cell_clean)
                            if ini_m:
                                ini = ini_m.group(1)
                                if ini == 'NK': fac_name = 'Ms. Neelam Kathait'
                                elif ini == 'RR': fac_name = 'Mr. Rachit Rastogi'
                                elif ini == 'AC': fac_name = 'Mr. Anurag Chauhan'
                                elif ini == 'OC': fac_name = 'Mr. Okesh Chhabra'
                                elif ini == 'SF': fac_name = 'Mr. Saurabh Fulara'
                                elif ini == 'NC': fac_name = 'Ms. Nishu Chawla'

                        # Handle Career Excellence Classes (CEC)
                        if 'CEC' in c_code:
                            c_name = 'Career Excellence Classes'
                            fac_name = 'Dr. Aashish Garg / Mr. Aayush Kumar'

                        if venue_name:
                            entry_type = 'LAB' if ('LAB' in venue_name or 'PCS' in c_code) else 'LECTURE'
                            all_entries.append({
                                'session_id': f"sess-p{page_num}-d{day_num}-{c_code}-{slot_start.replace(':', '')}",
                                'section': sec_name,
                                'day_of_week': day_num,
                                'start_time': slot_start,
                                'end_time': slot_end,
                                'course_code': c_code,
                                'course_name': c_name,
                                'faculty_name': fac_name,
                                'venue_name': venue_name,
                                'entry_type': entry_type,
                                'is_merged': is_merged,
                                'source_ref': f'Page {page_num} {sec_name} {day_str} Col {col_idx+1}'
                            })
                        else:
                            review_issues.append({
                                'page': page_num,
                                'section': sec_name,
                                'day': day_str,
                                'col': col_idx + 1,
                                'type': 'UNRESOLVED_ROOM',
                                'message': f"Could not determine room from cell '{cell_clean[:40]}'",
                                'raw_text': cell_clean
                            })

                        col_idx += (2 if is_merged else 1)

        return {
            "schema_version": "2026-v5",
            "institution_id": "GEHU",
            "sha256_digest": sha256,
            "page_count": page_count,
            "total_cells_processed": total_cells_processed,
            "extracted_sessions_count": len(all_entries),
            "merged_labs_count": merged_labs_count,
            "distinct_sections_count": len(sections_found),
            "distinct_sections": sections_found,
            "distinct_rooms_count": len(all_venues),
            "distinct_rooms": sorted(list(all_venues)),
            "distinct_courses_count": len(all_courses),
            "distinct_faculty_count": len(all_faculty),
            "review_issues_count": len(review_issues),
            "review_issues": review_issues,
            "sessions": all_entries
        }
