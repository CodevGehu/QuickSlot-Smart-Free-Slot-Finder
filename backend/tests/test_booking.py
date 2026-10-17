import pytest
from datetime import date, time, timedelta
from app.models.identity import UserRole
from app.models.resources import Venue

def test_booking_request_submission_and_scoping(client, auth_headers, db_session):
    student_headers = auth_headers(UserRole.STUDENT)
    venue = db_session.query(Venue).filter(Venue.name == "106 (LT)").first()
    assert venue is not None

    test_date = date.today() + timedelta(days=5)
    
    # 1. Student submits a booking request with Idempotency-Key
    req_payload = {
        "venue_id": str(venue.id),
        "purpose": "Robotics Club Technical Discussion",
        "booking_date": test_date.isoformat(),
        "start_time": "18:00:00",
        "end_time": "19:30:00",
        "expected_attendance": 40,
        "required_equipment": "Projector, AC",
        "participant_group": "Robotics Club"
    }

    import uuid
    test_key = f"test-key-robotics-{uuid.uuid4().hex[:8]}"
    resp = client.post(
        "/requests",
        json=req_payload,
        headers={**student_headers, "Idempotency-Key": test_key}
    )
    assert resp.status_code == 201
    req_data = resp.json()
    assert req_data["status"] == "PENDING"
    req_id = req_data["id"]

    # 2. Idempotent retry: re-submitting with identical key returns original request
    retry_resp = client.post(
        "/requests",
        json=req_payload,
        headers={**student_headers, "Idempotency-Key": test_key}
    )
    assert retry_resp.status_code == 201
    assert retry_resp.json()["id"] == req_id

    # 3. Check allocation faculty inbox:
    # Dr. Ananya Sharma is assigned to CS Block (which contains 106 (LT)).
    # Her inbox MUST see this request!
    dr_sharma_headers = auth_headers("dr.sharma@gehu.ac.in")
    inbox_resp = client.get("/allocation/inbox", headers=dr_sharma_headers)
    assert inbox_resp.status_code == 200
    inbox_items = inbox_resp.json()
    assert any(item["id"] == req_id for item in inbox_items)

    # 4. Prof. K.P. Nautiyal only manages KP Nautiyal Auditorium and Open Ground.
    # His inbox MUST NOT see this CS Block request!
    # (Section 1 & 10: "Allocation faculty receive the inbox for assigned rooms or buildings only")
    prof_nautiyal_headers = auth_headers("prof.nautiyal@gehu.ac.in")
    nautiyal_inbox_resp = client.get("/allocation/inbox", headers=prof_nautiyal_headers)
    assert nautiyal_inbox_resp.status_code == 200
    nautiyal_items = nautiyal_inbox_resp.json()
    assert not any(item["id"] == req_id for item in nautiyal_items)

    # 5. Approve the request via Dr. Ananya Sharma
    approve_resp = client.post(f"/allocation/requests/{req_id}/approve", headers=dr_sharma_headers)
    assert approve_resp.status_code == 200
    booking_data = approve_resp.json()
    assert booking_data["status"] == "ACTIVE"
    booking_id = booking_data["id"]

    # 6. Cancellation with audit trail
    cancel_resp = client.post(
        f"/bookings/{booking_id}/cancel",
        json={"cancellation_reason": "Event rescheduled due to campus workshop"},
        headers=dr_sharma_headers
    )
    assert cancel_resp.status_code == 200
    assert cancel_resp.json()["status"] == "CANCELLED"

def test_self_approval_prevention(client, auth_headers, db_session):
    """
    Requirement Section 1 & 7: An individual may hold both requester and allocator roles,
    but cannot approve their own request.
    """
    allocator_headers = auth_headers(UserRole.ALLOCATION_FACULTY)
    venue = db_session.query(Venue).filter(Venue.name == "106 (LT)").first()
    test_date = date.today() + timedelta(days=6)

    # Allocator submits a request as a requester
    req_resp = client.post(
        "/requests",
        json={
            "venue_id": str(venue.id),
            "purpose": "Faculty Meeting",
            "booking_date": test_date.isoformat(),
            "start_time": "18:00:00",
            "end_time": "19:00:00",
            "expected_attendance": 15
        },
        headers=allocator_headers
    )
    assert req_resp.status_code == 201
    req_id = req_resp.json()["id"]

    # Allocator attempts to approve their own request -> MUST BE REJECTED (HTTP 403)
    approve_resp = client.post(f"/allocation/requests/{req_id}/approve", headers=allocator_headers)
    assert approve_resp.status_code == 403
    assert "self-approval" in approve_resp.json()["detail"].lower()
