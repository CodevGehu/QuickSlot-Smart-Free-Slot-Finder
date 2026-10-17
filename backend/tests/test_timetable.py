import pytest
from app.services.timetable_parser import TimetableParser

def test_timetable_parser_structure():
    # Verify period times and conventions
    from app.services.timetable_parser import PERIOD_TIMES, DAYS_OF_WEEK
    assert len(PERIOD_TIMES) == 10
    assert len(DAYS_OF_WEEK) == 6
    assert PERIOD_TIMES[0] == ("08:00", "08:55")
    assert PERIOD_TIMES[6] == ("14:10", "15:05")  # Period 7
    assert PERIOD_TIMES[7] == ("15:05", "16:00")  # Period 8
    # Merged 7+8 lab = 14:10 - 16:00 as verified in proposal!
    assert PERIOD_TIMES[6][0] == "14:10" and PERIOD_TIMES[7][1] == "16:00"
