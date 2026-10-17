from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from datetime import date, time, datetime
import enum

class SlotState(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    OCCUPIED = "OCCUPIED"
    RESTRICTED = "RESTRICTED"
    UNKNOWN = "UNKNOWN"

class BusyInterval(BaseModel):
    start_time: str  # "HH:MM"
    end_time: str    # "HH:MM"
    event_type: str  # "CLASS", "BOOKING", "CLOSURE"
    title: str       # e.g. "TCS 502 (Section A1)", "ACM Hackathon"
    details: Optional[str] = None

class FreeInterval(BaseModel):
    start_time: str
    end_time: str
    duration_minutes: int

class VenueAvailability(BaseModel):
    venue_id: UUID
    venue_name: str
    venue_type: str
    building: str
    floor: int
    capacity: int
    features: List[str]
    approval_required: bool
    
    state: SlotState
    state_reason: str
    is_timetable_covered: bool
    
    busy_intervals: List[BusyInterval] = []
    free_intervals: List[FreeInterval] = []
    as_of: datetime

class AvailabilityQuery(BaseModel):
    target_date: date
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    duration_minutes: Optional[int] = None
    venue_type: Optional[str] = None
    building: Optional[str] = None
    min_capacity: Optional[int] = None
    required_features: Optional[List[str]] = None

class AvailabilityResponse(BaseModel):
    query_date: date
    search_window: Optional[str] = None
    total_venues: int
    available_count: int
    occupied_count: int
    restricted_count: int
    unknown_count: int
    cache_hit: bool = False
    venues: List[VenueAvailability]
