from datetime import date, time, datetime, timedelta
from typing import List, Optional, Dict, Any, Tuple
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import text, and_, or_
from zoneinfo import ZoneInfo

from app.models.resources import Venue, VenueType
from app.models.timetable import TimetableVersion, TimetableEntry, TimetableStatus
from app.models.booking import Booking, ResourceOccupancy, BookingLifecycleStatus, OccupancyEventType
from app.models.coordination import CampusMetadata, ResourceDayState
from app.schemas.availability import SlotState, BusyInterval, FreeInterval, VenueAvailability, AvailabilityResponse
from app.core.cache import cache
from app.core.config import settings

LOCAL_TZ = ZoneInfo("Asia/Kolkata")

def time_to_minutes(t: time) -> int:
    return t.hour * 60 + t.minute

def minutes_to_time_str(m: int) -> str:
    h = m // 60
    mins = m % 60
    return f"{h:02d}:{mins:02d}"

def intervals_overlap(start1: time, end1: time, start2: time, end2: time) -> bool:
    """Half-open interval check: [s1, e1) and [s2, e2) overlap iff s1 < e2 and s2 < e1"""
    return (start1 < end2) and (start2 < end1)

def merge_intervals(intervals: List[Tuple[int, int]]) -> List[Tuple[int, int]]:
    """Sorts and merges overlapping or adjacent intervals in O(n log n)."""
    if not intervals:
        return []
    sorted_inv = sorted(intervals, key=lambda x: x[0])
    merged = [sorted_inv[0]]
    for current in sorted_inv[1:]:
        prev_start, prev_end = merged[-1]
        cur_start, cur_end = current
        if cur_start <= prev_end:  # overlap or contiguous
            merged[-1] = (prev_start, max(prev_end, cur_end))
        else:
            merged.append(current)
    return merged

def compute_free_intervals(busy_spans: List[Tuple[int, int]], day_start_m: int = 480, day_end_m: int = 1080) -> List[FreeInterval]:
    """Computes free intervals in [day_start, day_end] after subtracting merged busy spans."""
    merged = merge_intervals(busy_spans)
    free_list = []
    curr = day_start_m
    for b_start, b_end in merged:
        b_start_clamped = max(day_start_m, min(day_end_m, b_start))
        b_end_clamped = max(day_start_m, min(day_end_m, b_end))
        if b_start_clamped > curr:
            dur = b_start_clamped - curr
            if dur >= 15:  # meaningful slot
                free_list.append(FreeInterval(
                    start_time=minutes_to_time_str(curr),
                    end_time=minutes_to_time_str(b_start_clamped),
                    duration_minutes=dur
                ))
        curr = max(curr, b_end_clamped)
    if curr < day_end_m:
        dur = day_end_m - curr
        if dur >= 15:
            free_list.append(FreeInterval(
                start_time=minutes_to_time_str(curr),
                end_time=minutes_to_time_str(day_end_m),
                duration_minutes=dur
            ))
    return free_list

class AvailabilityEngine:
    @staticmethod
    def get_campus_revisions(db: Session, campus_id: str) -> Tuple[int, int]:
        """Fetches active schedule_rev (S) and catalog_rev (C)."""
        meta = db.query(CampusMetadata).filter(CampusMetadata.campus_id == campus_id).first()
        if not meta:
            return (1, 1)
        return (meta.schedule_rev, meta.catalog_rev)

    @staticmethod
    def get_resource_day_rev(db: Session, campus_id: str, resource_id: UUID, target_date: date) -> int:
        """Fetches resource/day revision (R). Defaults to 0 if missing."""
        state = db.query(ResourceDayState).filter(
            ResourceDayState.campus_id == campus_id,
            ResourceDayState.resource_id == resource_id,
            ResourceDayState.local_date == target_date
        ).first()
        return state.data_rev if state else 0

    @classmethod
    def calculate_venue_availability(
        cls,
        db: Session,
        venue: Venue,
        target_date: date,
        search_start: Optional[time] = None,
        search_end: Optional[time] = None,
        duration_minutes: Optional[int] = None
    ) -> VenueAvailability:
        campus_id = venue.campus_id
        s_rev, c_rev = cls.get_campus_revisions(db, campus_id)
        r_rev = cls.get_resource_day_rev(db, campus_id, venue.id, target_date)
        
        # Check Valkey Cache
        cache_key = cache.build_key(campus_id, str(venue.id), target_date.isoformat(), s_rev, c_rev, r_rev)
        cached_data = cache.get_availability(cache_key)
        if cached_data:
            # We can re-evaluate target search window against cached busy intervals
            busy_intervals = [BusyInterval(**b) for b in cached_data.get("busy_intervals", [])]
            free_intervals = [FreeInterval(**f) for f in cached_data.get("free_intervals", [])]
            is_covered = cached_data.get("is_timetable_covered", True)
            state, reason = cls._evaluate_state(busy_intervals, is_covered, venue, search_start, search_end, duration_minutes)
            return VenueAvailability(
                venue_id=venue.id,
                venue_name=venue.name,
                venue_type=venue.venue_type.name if venue.venue_type else "General",
                building=venue.building,
                floor=venue.floor,
                capacity=venue.capacity,
                features=venue.features or [],
                approval_required=venue.approval_required,
                state=state,
                state_reason=reason,
                is_timetable_covered=is_covered,
                busy_intervals=busy_intervals,
                free_intervals=free_intervals,
                as_of=datetime.fromisoformat(cached_data.get("generated_at"))
            )

        # Database Calculation
        # 1. Day of week (1=Mon ... 7=Sun)
        day_of_week = target_date.isoweekday()

        # 2. Check active timetable coverage
        active_version = db.query(TimetableVersion).filter(
            TimetableVersion.campus_id == campus_id,
            TimetableVersion.is_active == True,
            TimetableVersion.effective_from <= target_date,
            or_(TimetableVersion.effective_until == None, TimetableVersion.effective_until >= target_date)
        ).first()

        is_timetable_covered = active_version is not None

        busy_intervals: List[BusyInterval] = []
        busy_spans: List[Tuple[int, int]] = []

        # 3. Fetch Timetable Entries for this venue on this day of week
        if active_version:
            entries = db.query(TimetableEntry).filter(
                TimetableEntry.version_id == active_version.id,
                TimetableEntry.venue_id == venue.id,
                TimetableEntry.day_of_week == day_of_week,
                TimetableEntry.is_active == True
            ).all()
            for ent in entries:
                s_str = ent.start_time.strftime("%H:%M")
                e_str = ent.end_time.strftime("%H:%M")
                sec_name = ent.section.name if ent.section else "All Sections"
                sub_code = ent.subject.code if ent.subject else "Class"
                busy_intervals.append(BusyInterval(
                    start_time=s_str,
                    end_time=e_str,
                    event_type="CLASS",
                    title=f"{sub_code} ({sec_name})",
                    details=f"Faculty: {ent.faculty.full_name if ent.faculty else 'Department'} | {ent.entry_type.value}"
                ))
                busy_spans.append((time_to_minutes(ent.start_time), time_to_minutes(ent.end_time)))

        # 4. Fetch Confirmed Bookings for this venue on this target date
        bookings = db.query(Booking).filter(
            Booking.venue_id == venue.id,
            Booking.booking_date == target_date,
            Booking.status == BookingLifecycleStatus.ACTIVE
        ).all()
        for b in bookings:
            s_str = b.start_time.strftime("%H:%M")
            e_str = b.end_time.strftime("%H:%M")
            busy_intervals.append(BusyInterval(
                start_time=s_str,
                end_time=e_str,
                event_type="BOOKING",
                title=f"Reserved: {b.request.purpose if b.request else 'Event'}",
                details=f"Booked by: {b.booked_by.full_name if b.booked_by else 'Authorized user'}"
            ))
            busy_spans.append((time_to_minutes(b.start_time), time_to_minutes(b.end_time)))

        # Sort busy intervals chronologically
        busy_intervals.sort(key=lambda x: x.start_time)

        # 5. Compute Free Intervals
        free_intervals = compute_free_intervals(busy_spans)

        # 6. Evaluate State for the search window
        state, reason = cls._evaluate_state(busy_intervals, is_timetable_covered, venue, search_start, search_end, duration_minutes)

        now_utc = datetime.utcnow()
        # Save to cache
        cache_payload = {
            "busy_intervals": [b.dict() for b in busy_intervals],
            "free_intervals": [f.dict() for f in free_intervals],
            "is_timetable_covered": is_timetable_covered,
            "generated_at": now_utc.isoformat()
        }
        cache.set_availability(cache_key, cache_payload)

        return VenueAvailability(
            venue_id=venue.id,
            venue_name=venue.name,
            venue_type=venue.venue_type.name if venue.venue_type else "General",
            building=venue.building,
            floor=venue.floor,
            capacity=venue.capacity,
            features=venue.features or [],
            approval_required=venue.approval_required,
            state=state,
            state_reason=reason,
            is_timetable_covered=is_timetable_covered,
            busy_intervals=busy_intervals,
            free_intervals=free_intervals,
            as_of=now_utc
        )

    @staticmethod
    def _evaluate_state(
        busy_intervals: List[BusyInterval],
        is_covered: bool,
        venue: Venue,
        search_start: Optional[time],
        search_end: Optional[time],
        duration_minutes: Optional[int]
    ) -> Tuple[SlotState, str]:
        # Rule 1: Incomplete timetable coverage must NOT be claimed as verified free!
        if not is_covered:
            return SlotState.UNKNOWN, "Timetable version for this date is unpublished or missing. Free slot cannot be verified."

        if not venue.is_active:
            return SlotState.RESTRICTED, "Venue is currently marked inactive or under maintenance."

        # If no specific time requested, indicate general availability
        if not search_start and not search_end and not duration_minutes:
            if not busy_intervals:
                return SlotState.AVAILABLE, "No scheduled timetable sessions or reservations on this date."
            return SlotState.OCCUPIED, f"Occupied for {len(busy_intervals)} periods on this date. View free periods."

        # If start and end provided
        if search_start and search_end:
            for busy in busy_intervals:
                b_start = datetime.strptime(busy.start_time, "%H:%M").time()
                b_end = datetime.strptime(busy.end_time, "%H:%M").time()
                if intervals_overlap(search_start, search_end, b_start, b_end):
                    return SlotState.OCCUPIED, f"Clash with {busy.title} ({busy.start_time} - {busy.end_time})."
            return SlotState.AVAILABLE, f"Verified free from {search_start.strftime('%H:%M')} to {search_end.strftime('%H:%M')}."

        # If required duration provided
        if duration_minutes:
            # Check if any free block is >= duration_minutes
            for f in compute_free_intervals([(time_to_minutes(datetime.strptime(b.start_time, "%H:%M").time()), time_to_minutes(datetime.strptime(b.end_time, "%H:%M").time())) for b in busy_intervals]):
                if f.duration_minutes >= duration_minutes:
                    return SlotState.AVAILABLE, f"Has continuous free block of {f.duration_minutes} mins ({f.start_time} - {f.end_time})."
            return SlotState.OCCUPIED, f"No continuous free interval of {duration_minutes} minutes available."

        return SlotState.AVAILABLE, "Slot available."
