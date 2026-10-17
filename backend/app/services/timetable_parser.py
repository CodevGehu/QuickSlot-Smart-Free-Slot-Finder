import re
import hashlib
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path
import pdfplumber

# Standard Period Times (GEHU layout convention confirmed in Proposal Section 2 & 3)
PERIOD_TIMES = [
    ("08:00", "08:55"),
    ("08:55", "09:50"),
    ("10:10", "11:05"),
    ("11:05", "12:00"),
    ("12:00", "12:55"),
    ("12:55", "13:50"),
    ("14:10", "15:05"),
    ("15:05", "16:00"),
    ("16:00", "16:55"),
    ("16:55", "17:50"),
]

DAYS_OF_WEEK = ["MON", "TUE", "WED", "THU", "FRI", "SAT"]

# Regex helpers for course codes and room names
COURSE_CODE_PATTERN = re.compile(r"([A-Z]{3}\s*\d{3}[A-Z]?)", re.IGNORECASE)
ROOM_PATTERN = re.compile(r"(\b\d{3}[-A-Z]*|\bCR-\d+|\bLT-\d+|\bAUDITORIUM|\bLAB[-A-Z0-9]*)", re.IGNORECASE)

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
        Extracts native text and table grid geometry from college timetable PDF using pdfplumber.
        Generates canonical JSON format with source evidence.
        """
        sha256 = cls.calculate_file_hash(pdf_path)
        extracted_sessions = []
        review_issues = []
        distinct_rooms = set()
        distinct_teachers = set()
        distinct_subjects = set()
        total_cells_processed = 0
        merged_labs_count = 0

        with pdfplumber.open(pdf_path) as pdf:
            page_count = len(pdf.pages)
            for page_idx, page in enumerate(pdf.pages):
                page_num = page_idx + 1
                page_text = page.extract_text() or ""
                
                # Detect section header (e.g. "Section A1", "B.Tech CSE V Semester Section A1")
                section_match = re.search(r"Section\s*[:\-]?\s*([A-Za-z0-9]+)", page_text, re.IGNORECASE)
                section_name = section_match.group(1).upper() if section_match else f"SEC-{page_num}"

                tables = page.extract_tables()
                if not tables:
                    review_issues.append({
                        "page": page_num,
                        "type": "NO_TABLE_FOUND",
                        "message": f"Page {page_num} has no detectable table lines."
                    })
                    continue

                for table in tables:
                    if not table or len(table) < 2:
                        continue
                    
                    # Look for weekday rows
                    for row_idx, row in enumerate(table):
                        if not row or len(row) < 3:
                            continue
                        first_cell = str(row[0] or "").strip().upper()
                        
                        matched_day = None
                        for d_idx, day_name in enumerate(DAYS_OF_WEEK):
                            if day_name in first_cell:
                                matched_day = d_idx + 1  # 1=Mon ... 6=Sat
                                break
                                
                        if not matched_day:
                            continue

                        # Process period columns in this day row
                        col_count = len(row) - 1
                        c = 1
                        while c < len(row):
                            cell_text = str(row[c] or "").strip()
                            total_cells_processed += 1
                            
                            if not cell_text or cell_text.upper() in ["LUNCH", "RECESS", "BREAK", "NIL", "-"]:
                                c += 1
                                continue

                            # Detect merged 2-hour lab sessions:
                            # If adjacent cell has same content or empty indicating a merged cell span
                            is_merged_lab = False
                            span_periods = 1
                            if c + 1 < len(row):
                                next_cell = str(row[c+1] or "").strip()
                                if (next_cell == cell_text or next_cell == "") and ("LAB" in cell_text.upper() or "PCS" in cell_text.upper()):
                                    is_merged_lab = True
                                    span_periods = 2
                                    merged_labs_count += 1

                            period_idx = min(c - 1, len(PERIOD_TIMES) - 1)
                            start_time = PERIOD_TIMES[period_idx][0]
                            
                            if is_merged_lab and period_idx + 1 < len(PERIOD_TIMES):
                                end_time = PERIOD_TIMES[period_idx + 1][1]
                                c += 2
                            else:
                                end_time = PERIOD_TIMES[period_idx][1]
                                c += 1

                            # Extract course code
                            sub_match = COURSE_CODE_PATTERN.search(cell_text)
                            course_code = sub_match.group(1).replace(" ", "").upper() if sub_match else "UNKNOWN_COURSE"
                            distinct_subjects.add(course_code)

                            # Extract room
                            room_match = ROOM_PATTERN.search(cell_text)
                            room_name = room_match.group(1).upper() if room_match else None
                            if room_name:
                                distinct_rooms.add(room_name)
                            else:
                                review_issues.append({
                                    "page": page_num,
                                    "day": matched_day,
                                    "start": start_time,
                                    "cell_text": cell_text[:50],
                                    "type": "UNRESOLVED_ROOM",
                                    "message": f"Could not determine room candidate from cell '{cell_text[:30]}...'"
                                })

                            # Entry type
                            entry_type = "LAB" if ("LAB" in cell_text.upper() or "PCS" in course_code) else "LECTURE"

                            session_record = {
                                "session_id": f"sess-p{page_num}-d{matched_day}-{start_time.replace(':', '')}",
                                "section": section_name,
                                "day_of_week": matched_day,
                                "start_time": start_time,
                                "end_time": end_time,
                                "course_code": course_code,
                                "entry_type": entry_type,
                                "room_candidate": room_name or "UNASSIGNED",
                                "raw_text": cell_text,
                                "source_ref": f"Page {page_num}, Row {row_idx+1}, Col {c}",
                                "is_merged": is_merged_lab
                            }
                            extracted_sessions.append(session_record)

        return {
            "schema_version": "2020-12",
            "institution_id": "GEHU",
            "sha256_digest": sha256,
            "page_count": page_count,
            "total_cells_processed": total_cells_processed,
            "extracted_sessions_count": len(extracted_sessions),
            "merged_labs_count": merged_labs_count,
            "distinct_rooms_count": len(distinct_rooms),
            "distinct_rooms": sorted(list(distinct_rooms)),
            "distinct_subjects": sorted(list(distinct_subjects)),
            "review_issues_count": len(review_issues),
            "review_issues": review_issues[:100],  # Sample first 100 issues for UI review
            "sessions": extracted_sessions
        }
