import pandas as pd
import re
import psycopg2

# ==========================================================
# CONFIG
# ==========================================================

EXCEL_FILE = "tt.xlsx"
OUTPUT_SQL = "timetable_entries.sql"

TIMETABLE_VERSION_ID = "ec65ad6c-7583-4c12-a0ad-4e5ed0239a52"

# PostgreSQL


DB_CONFIG = {
    "host": "aws-1-ap-northeast-1.pooler.supabase.com",
    "port": 6543,
    "dbname": "postgres",
    "user": "postgres.zjgbjhaivwlfmlimtnrp",
    "password": "1p@$$w0r_D9897"
}

# ==========================================================
# TIME SLOTS
# ==========================================================

TIME_SLOTS = [
    ("08:00", "08:55"),
    ("08:55", "09:50"),
    ("10:10", "11:05"),
    ("11:05", "12:00"),
    ("12:00", "12:55"),
    ("12:55", "01:50"),
    ("02:10", "03:05"),
    ("03:05", "04:00"),
    ("04:00", "04:55"),
    ("04:55", "05:50"),
]

DAY_MAP = {
    "MON": 1,
    "TUE": 2,
    "WED": 3,
    "THU": 4,
    "FRI": 5,
    "SAT": 6
}

DAYS = [
    "MON",
    "TUE",
    "WED",
    "THU",
    "FRI",
    "SAT"
]

# ==========================================================
# HELPERS
# ==========================================================

def clean(value):
    if pd.isna(value):
        return ""

    return str(value).strip()


def detect_session_type(subject_code, text):

    txt = text.upper()

    if "PROJECT BASED LEARNING" in txt:
        return "PBL"

    if "LAB" in txt:
        return "LAB"

    if "TCL" in txt:
        return "TUTORIAL"

    if "WORKSHOP" in txt:
        return "WORKSHOP"

    if "SEMINAR" in txt:
        return "SEMINAR"

    if subject_code.startswith("PCS"):
        return "LAB"

    return "LECTURE"


def extract_subject_code(text):

    match = re.search(
        r'(TCS\d+|PCS\d+|XCS\d+|PESE\s*\d+|CEC)',
        text,
        re.IGNORECASE
    )

    if not match:
        return None

    return match.group(1).replace(" ", "").upper()


def extract_venue(text):

    lines = [x.strip() for x in text.split("\n") if x.strip()]

    if len(lines) < 2:
        return None

    venue = lines[-1]

    venue = venue.replace("(", "")
    venue = venue.replace(")", "")

    return venue.strip()


# ==========================================================
# DATABASE LOOKUPS
# ==========================================================

conn = psycopg2.connect(**DB_CONFIG)
cur = conn.cursor()

cur.execute("""
SELECT code,id
FROM subjects
""")
SUBJECT_MAP = {
    code.upper(): sid
    for code, sid in cur.fetchall()
}

cur.execute("""
SELECT name,id
FROM sections
""")
SECTION_MAP = {
    name.upper(): sid
    for name, sid in cur.fetchall()
}

cur.execute("""
SELECT name,id
FROM venues
""")
VENUE_MAP = {
    name.upper(): vid
    for name, vid in cur.fetchall()
}

cur.execute("""
SELECT full_name,id
FROM users
""")
USER_MAP = {
    name.upper(): uid
    for name, uid in cur.fetchall()
}

# ==========================================================
# SQL COLLECTION
# ==========================================================

sql_lines = []

# ==========================================================
# PROCESS ALL SHEETS
# ==========================================================

excel = pd.ExcelFile(EXCEL_FILE)
SECTION_ORDER = [
    "CSE-A",
    "A1",
    "A2",
    "B1",
    "B2",
    "C1",
    "C2",
    "D1",
    "D2",
    "E1",
    "E2",
    "F1",
    "F2",
    "G1",
    "CS-1",
    "ML-1",
    "ML-2",
    "ML-3",
    "DS-1"
]

for sheet_index, sheet_name in enumerate(excel.sheet_names):
    if sheet_index % 2 != 0:
        continue

    df = pd.read_excel(
        EXCEL_FILE,
        sheet_name=sheet_name,
        header=None
    )

    # -------------------------------------
    # SECTION NAME
    # -------------------------------------

    section_name = SECTION_ORDER[sheet_index // 2].upper()

    section_id = SECTION_MAP.get(section_name)

    if not section_id:
        print(f"Section not found: {section_name}")
        continue

    # -------------------------------------
    # SUBJECT / FACULTY TABLE
    # -------------------------------------

    faculty_map = {}

    print("\nSECTION =", section_name)

    for i in range(len(df)):

        row_text = " ".join(
            [clean(x) for x in df.iloc[i].tolist()]
        )

        code_match = re.search(
            r'(TCS\d+|PCS\d+|XCS\d+|PESE\s*\d+)',
            row_text,
            re.IGNORECASE
        )

        if code_match:
            print("FOUND SUBJECT:", code_match)

            code = code_match.group(1).replace(
                " ", ""
            ).upper()

            cols = [clean(x) for x in df.iloc[i].tolist()]

            if len(cols) >= 3:

                faculty = cols[-1].strip()
                print("FACULTY =", faculty)

                faculty_map[code] = faculty

                print(faculty_map)
                

    # -------------------------------------
    # TIMETABLE GRID
    # -------------------------------------

    for row_idx in range(len(df)):

        first_col = clean(df.iloc[row_idx, 0]).upper()

        if first_col not in DAYS:
            continue

        day = first_col

        for slot_idx in range(min(10, len(TIME_SLOTS))):

            col = slot_idx + 1

            if col >= df.shape[1]:
                continue

            cell = clean(df.iloc[row_idx, col])

            if not cell:
                continue

            code = extract_subject_code(cell)

            if not code:
                continue

            subject_id = SUBJECT_MAP.get(code)

            if not subject_id:
                print("Missing subject:", code)
                continue

            faculty_name = faculty_map.get(code)

            faculty_id = None

            if faculty_name:
                faculty_id = USER_MAP.get(
                    faculty_name.upper()
                )

            venue_code = extract_venue(cell)

            venue_id = None

            if venue_code:
                venue_id = VENUE_MAP.get(
                    venue_code.upper().strip()
                )

            session_type = detect_session_type(
                code,
                cell
            )

            start_time, end_time = TIME_SLOTS[slot_idx]

            sql = f"""
INSERT INTO timetable_entries
(
    version_id,
    section_id,
    subject_id,
    faculty_id,
    venue_id,
    day_of_week,
    start_time,
    end_time,
    entry_type
)
VALUES
(
    '{TIMETABLE_VERSION_ID}',
    '{section_id}',
    '{subject_id}',
    {'NULL' if not faculty_id else f"'{faculty_id}'"},
    {'NULL' if not venue_id else f"'{venue_id}'"},
    {DAY_MAP[day]},
    '{start_time}',
    '{end_time}',
    '{session_type}'
);
"""

            sql_lines.append(sql)

# ==========================================================
# WRITE SQL FILE
# ==========================================================

with open(OUTPUT_SQL, "w", encoding="utf-8") as f:

    f.write("-- Auto Generated Timetable Inserts\n\n")

    for line in sql_lines:
        f.write(line)
        f.write("\n")

print(f"Generated {len(sql_lines)} entries")
print(f"Saved -> {OUTPUT_SQL}")

cur.close()
conn.close()