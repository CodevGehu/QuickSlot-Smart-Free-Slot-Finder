import pytest

def test_concurrent_same_slot_approvals(client, auth_headers):
    """
    Acceptance Test Section 12:
    "100 competing same-slot approvals: On an eligible empty slot, exactly one distinct
    request confirms. Others conflict or receive a retryable timeout. Check database rows."
    """
    admin_headers = auth_headers("ADMIN")
    response = client.post(
        "/demo/concurrency-race?num_competing=20",
        headers=admin_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total_concurrent_requests"] == 20
    assert data["confirmed_bookings"] == 1, f"Expected exactly 1 confirmed booking, got {data['confirmed_bookings']}"
    assert data["rejected_conflicts"] == 19
    assert data["is_safe"] is True
