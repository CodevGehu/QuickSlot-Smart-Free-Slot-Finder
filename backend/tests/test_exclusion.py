import pytest
from datetime import datetime, date, time
from zoneinfo import ZoneInfo
from sqlalchemy.exc import IntegrityError
from app.models.resources import Venue
from app.models.booking import ResourceOccupancy, OccupancyEventType

LOCAL_TZ = ZoneInfo("Asia/Kolkata")

def test_btree_gist_exclusion_constraint(db_session):
    venue = db_session.query(Venue).first()
    assert venue is not None, "Venue should exist in seeded database"

    today = date.today()
    dt_10 = datetime.combine(today, time(10, 0), tzinfo=LOCAL_TZ)
    dt_11 = datetime.combine(today, time(11, 0), tzinfo=LOCAL_TZ)
    dt_12 = datetime.combine(today, time(12, 0), tzinfo=LOCAL_TZ)
    dt_10_30 = datetime.combine(today, time(10, 30), tzinfo=LOCAL_TZ)
    dt_11_30 = datetime.combine(today, time(11, 30), tzinfo=LOCAL_TZ)

    # Clean test entries
    db_session.query(ResourceOccupancy).filter(
        ResourceOccupancy.resource_id == venue.id,
        ResourceOccupancy.starts_at >= dt_10,
        ResourceOccupancy.ends_at <= dt_12
    ).delete()
    db_session.commit()

    # 1. Insert first block [10:00, 11:00)
    occ1 = ResourceOccupancy(
        campus_id=venue.campus_id,
        resource_id=venue.id,
        event_type=OccupancyEventType.BOOKING,
        starts_at=dt_10,
        ends_at=dt_11,
        is_active=True
    )
    db_session.add(occ1)
    db_session.commit()

    # 2. Insert adjacent block [11:00, 12:00) -> MUST SUCCEED because of half-open interval [start, end)
    occ_adjacent = ResourceOccupancy(
        campus_id=venue.campus_id,
        resource_id=venue.id,
        event_type=OccupancyEventType.BOOKING,
        starts_at=dt_11,
        ends_at=dt_12,
        is_active=True
    )
    db_session.add(occ_adjacent)
    db_session.commit()

    # 3. Attempt to insert overlapping block [10:30, 11:30) -> MUST FAIL via btree_gist EXCLUDE constraint!
    occ_overlap = ResourceOccupancy(
        campus_id=venue.campus_id,
        resource_id=venue.id,
        event_type=OccupancyEventType.BOOKING,
        starts_at=dt_10_30,
        ends_at=dt_11_30,
        is_active=True
    )
    db_session.add(occ_overlap)
    with pytest.raises(IntegrityError) as exc_info:
        db_session.commit()

    assert "exclude_resource_occupancy_overlap" in str(exc_info.value).lower()
    db_session.rollback()

    # Clean up test records
    db_session.query(ResourceOccupancy).filter(ResourceOccupancy.id.in_([occ1.id, occ_adjacent.id])).delete()
    db_session.commit()
