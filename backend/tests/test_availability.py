import pytest
from datetime import date, time, timedelta
from app.models.resources import Venue

def test_availability_known_class_clash(client):
    # Find next Tuesday
    today = date.today()
    days_until_tuesday = (1 - today.weekday()) % 7
    if days_until_tuesday == 0:
        days_until_tuesday = 7
    tuesday = today + timedelta(days=days_until_tuesday)

    # Search Tuesday 14:30 - 15:30 (overlaps PCS 502 lab in 302-A from 14:10 to 16:00)
    response = client.get(
        "/availability",
        params={
            "target_date": tuesday.isoformat(),
            "start_time": "14:30",
            "end_time": "15:30",
            "building": "CS Block"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total_venues"] > 0
    
    # 302-A (LAB) must report OCCUPIED
    lab_302 = next((v for v in data["venues"] if "302-A" in v["venue_name"]), None)
    assert lab_302 is not None
    assert lab_302["state"] == "OCCUPIED"
    assert "PCS 502" in lab_302["state_reason"] or "Clash" in lab_302["state_reason"]

def test_availability_uncovered_date_reports_unknown(client):
    # Date 2 years in future has no timetable version
    future_date = date.today() + timedelta(days=730)
    response = client.get(
        "/availability",
        params={
            "target_date": future_date.isoformat(),
            "start_time": "10:00",
            "end_time": "11:00"
        }
    )
    assert response.status_code == 200
    data = response.json()
    
    # All venues must report UNKNOWN, NOT AVAILABLE!
    # Requirement: "Do not treat incomplete timetable coverage as proof that a room is free."
    for venue in data["venues"]:
        assert venue["state"] == "UNKNOWN"
        assert "unverified" in venue["state_reason"].lower() or "missing" in venue["state_reason"].lower()

def test_teacher_venue_schedule(client, db_session):
    from app.models.identity import User
    teacher = db_session.query(User).filter(User.email == "dr.verma@gehu.ac.in").first()
    assert teacher is not None

    response = client.get(f"/teachers/{teacher.id}/schedule?day_of_week=2")
    assert response.status_code == 200
    data = response.json()
    assert data["teacher_name"] == teacher.full_name
    assert len(data["scheduled_classes"]) > 0
    # Must include disclaimer
    assert "not real-time GPS location" in data["disclaimer"]
