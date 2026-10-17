from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import date, time, datetime

from app.core.database import get_db
from app.models.resources import Venue, VenueType
from app.services.availability_engine import AvailabilityEngine
from app.schemas.availability import AvailabilityResponse, VenueAvailability, SlotState

router = APIRouter(prefix="/availability", tags=["Module A: Free Slot Finder"])

@router.get("", response_model=AvailabilityResponse)
def search_availability(
    target_date: date = Query(default_factory=date.today),
    start_time: Optional[time] = Query(None, description="Format HH:MM:SS or HH:MM"),
    end_time: Optional[time] = Query(None, description="Format HH:MM:SS or HH:MM"),
    duration_minutes: Optional[int] = Query(None, ge=15, le=480),
    venue_type: Optional[str] = Query(None),
    building: Optional[str] = Query(None),
    min_capacity: Optional[int] = Query(None, ge=1),
    features: Optional[str] = Query(None, description="Comma-separated required features, e.g. Projector,AC"),
    db: Session = Depends(get_db)
):
    query = db.query(Venue).filter(Venue.is_active == True)
    
    if venue_type:
        query = query.join(VenueType).filter(VenueType.name.ilike(f"%{venue_type}%"))
    if building:
        query = query.filter(Venue.building.ilike(f"%{building}%"))
    if min_capacity:
        query = query.filter(Venue.capacity >= min_capacity)
        
    venues = query.order_by(Venue.building, Venue.floor, Venue.name).all()
    
    req_features = [f.strip().lower() for f in features.split(",") if f.strip()] if features else []
    
    results: List[VenueAvailability] = []
    avail_count = 0
    occ_count = 0
    rest_count = 0
    unk_count = 0
    
    for v in venues:
        # Check feature filter
        if req_features:
            v_features = [feat.lower() for feat in (v.features or [])]
            if not all(rf in v_features for rf in req_features):
                continue
                
        avail = AvailabilityEngine.calculate_venue_availability(
            db=db,
            venue=v,
            target_date=target_date,
            search_start=start_time,
            search_end=end_time,
            duration_minutes=duration_minutes
        )
        
        if avail.state == SlotState.AVAILABLE:
            avail_count += 1
        elif avail.state == SlotState.OCCUPIED:
            occ_count += 1
        elif avail.state == SlotState.RESTRICTED:
            rest_count += 1
        else:
            unk_count += 1
            
        results.append(avail)

    search_win = None
    if start_time and end_time:
        search_win = f"{start_time.strftime('%H:%M')} - {end_time.strftime('%H:%M')}"
    elif duration_minutes:
        search_win = f"{duration_minutes} minutes"

    return AvailabilityResponse(
        query_date=target_date,
        search_window=search_win,
        total_venues=len(results),
        available_count=avail_count,
        occupied_count=occ_count,
        restricted_count=rest_count,
        unknown_count=unk_count,
        venues=results
    )
