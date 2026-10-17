import hashlib
import json
import uuid
from datetime import date, time, datetime
from zoneinfo import ZoneInfo
from typing import Optional, Dict, Any, Tuple
from uuid import UUID

from sqlalchemy.orm import Session
from sqlalchemy import text, and_, or_
from sqlalchemy.exc import IntegrityError, DBAPIError
from fastapi import HTTPException, status

from app.models.identity import User, UserRole
from app.models.resources import Venue, AllocationAssignment
from app.models.timetable import TimetableVersion, TimetableEntry
from app.models.booking import (
    BookingRequest, Booking, ResourceOccupancy, 
    BookingRequestStatus, BookingLifecycleStatus, OccupancyEventType
)
from app.models.coordination import ResourceDayState, IdempotencyRecord
from app.models.jobs import OutboxJob, OutboxStatus
from app.models.audit import AuditLog
from app.services.availability_engine import intervals_overlap

CAMPUS_ADVISORY_LOCK_ID = 41001
LOCAL_TZ = ZoneInfo("Asia/Kolkata")

def hash_payload(data: Any) -> str:
    serialized = json.dumps(data, sort_keys=True, default=str)
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()

class BookingService:
    @staticmethod
    def verify_allocation_scope(db: Session, faculty_user: User, venue: Venue) -> bool:
        """
        Verifies if faculty member is explicitly assigned allocation authority
        for this room or its building.
        System administrator status alone does NOT confer approval permission
        without explicit allocation assignment (Section 10).
        """
        assignment = db.query(AllocationAssignment).filter(
            AllocationAssignment.faculty_user_id == faculty_user.id,
            AllocationAssignment.is_active == True,
            or_(
                AllocationAssignment.venue_id == venue.id,
                and_(AllocationAssignment.venue_id == None, AllocationAssignment.building == venue.building)
            )
        ).first()
        return assignment is not None

    @classmethod
    def submit_request(
        cls,
        db: Session,
        requester: User,
        venue_id: UUID,
        purpose: str,
        booking_date: date,
        start_time: time,
        end_time: time,
        expected_attendance: int,
        required_equipment: Optional[str] = None,
        participant_group: Optional[str] = None,
        idempotency_key: Optional[str] = None
    ) -> BookingRequest:
        """
        Submits a booking request. Pending requests do NOT reserve the room.
        Deduplicates via Idempotency-Key if provided.
        """
        venue = db.query(Venue).filter(Venue.id == venue_id).first()
        if not venue or not venue.is_active:
            raise HTTPException(status_code=404, detail="Selected venue not found or is inactive.")

        if start_time >= end_time:
            raise HTTPException(status_code=400, detail="Start time must be before end time.")

        # Check idempotency
        payload_hash = hash_payload({
            "venue_id": str(venue_id),
            "booking_date": str(booking_date),
            "start_time": str(start_time),
            "end_time": str(end_time),
            "purpose": purpose
        })
        
        if idempotency_key:
            existing_idem = db.query(IdempotencyRecord).filter(
                IdempotencyRecord.campus_id == venue.campus_id,
                IdempotencyRecord.user_id == requester.id,
                IdempotencyRecord.request_key == idempotency_key
            ).first()
            if existing_idem:
                if existing_idem.payload_hash != payload_hash:
                    raise HTTPException(status_code=409, detail="Idempotency key reused with different payload.")
                # Return existing request
                existing_req = db.query(BookingRequest).filter(BookingRequest.id == UUID(existing_idem.response_body["request_id"])).first()
                if existing_req:
                    return existing_req

        new_request = BookingRequest(
            campus_id=venue.campus_id,
            requested_by_user_id=requester.id,
            venue_id=venue.id,
            purpose=purpose,
            booking_date=booking_date,
            start_time=start_time,
            end_time=end_time,
            expected_attendance=expected_attendance,
            required_equipment=required_equipment,
            participant_group=participant_group,
            status=BookingRequestStatus.PENDING
        )
        db.add(new_request)
        db.flush()

        # Insert outbox notification for allocation faculty
        outbox = OutboxJob(
            campus_id=venue.campus_id,
            event_type="REQUEST_SUBMITTED",
            payload={
                "request_id": str(new_request.id),
                "venue_name": venue.name,
                "building": venue.building,
                "booking_date": str(booking_date),
                "time": f"{start_time} - {end_time}",
                "requester": requester.full_name
            }
        )
        db.add(outbox)

        # Record idempotency if provided
        if idempotency_key:
            idem_rec = IdempotencyRecord(
                campus_id=venue.campus_id,
                user_id=requester.id,
                request_key=idempotency_key,
                payload_hash=payload_hash,
                response_code=201,
                response_body={"request_id": str(new_request.id)}
            )
            db.add(idem_rec)

        db.commit()
        db.refresh(new_request)
        return new_request

    @classmethod
    def approve_request(
        cls,
        db: Session,
        approver: User,
        request_id: UUID,
        idempotency_key: Optional[str] = None
    ) -> Booking:
        """
        Atomic Booking Approval adhering to Section 3 & Section 7:
        1. Shared campus advisory lock pg_advisory_xact_lock_shared(41001, 1).
        2. Idempotency reservation.
        3. Lock request row FOR UPDATE.
        4. Enforce allocation scope & no self-approval.
        5. Lock resource_day_state row FOR UPDATE.
        6. Recheck timetable & occupancy under locks.
        7. Insert Booking and ResourceOccupancy (exclusion constraint enforced).
        8. Mark request APPROVED.
        9. Write audit log & outbox event.
        10. Commit transaction. Rollback on any failure.
        """
        # Step 1: Take shared campus advisory lock
        db.execute(text(f"SELECT pg_advisory_xact_lock_shared({CAMPUS_ADVISORY_LOCK_ID}, 1);"))

        # Step 2: Lock the request row
        req: Optional[BookingRequest] = db.query(BookingRequest).filter(
            BookingRequest.id == request_id
        ).with_for_update().first()

        if not req:
            raise HTTPException(status_code=404, detail="Booking request not found.")

        if req.status != BookingRequestStatus.PENDING:
            raise HTTPException(
                status_code=400, 
                detail=f"Request cannot be approved because current status is {req.status.value}."
            )

        venue = db.query(Venue).filter(Venue.id == req.venue_id).first()
        if not venue:
            raise HTTPException(status_code=404, detail="Venue not found.")

        # Step 3: Enforce No Self-Approval (Section 1 & 7)
        if req.requested_by_user_id == approver.id:
            raise HTTPException(
                status_code=403,
                detail="Self-approval prohibited: An allocator cannot approve their own booking request."
            )

        # Step 4: Enforce Allocation Scope (Section 1 & 10)
        if not cls.verify_allocation_scope(db, approver, venue):
            raise HTTPException(
                status_code=403,
                detail=f"Access denied: You are not assigned allocation authority for venue '{venue.name}' ({venue.building})."
            )

        # Step 5: Stable Resource/Day Serialization Lock (Section 7)
        # Create missing row if needed, then SELECT FOR UPDATE
        day_state = db.query(ResourceDayState).filter(
            ResourceDayState.campus_id == venue.campus_id,
            ResourceDayState.resource_id == venue.id,
            ResourceDayState.local_date == req.booking_date
        ).first()

        if not day_state:
            day_state = ResourceDayState(
                campus_id=venue.campus_id,
                resource_id=venue.id,
                local_date=req.booking_date,
                data_rev=1
            )
            db.add(day_state)
            db.flush()

        # Explicit row lock on resource_day_state
        db.query(ResourceDayState).filter(
            ResourceDayState.id == day_state.id
        ).with_for_update().one()

        # Step 6: Recheck timetable coverage and occupancy conflicts under locks
        day_of_week = req.booking_date.isoweekday()
        active_version = db.query(TimetableVersion).filter(
            TimetableVersion.campus_id == venue.campus_id,
            TimetableVersion.is_active == True,
            TimetableVersion.effective_from <= req.booking_date,
            or_(TimetableVersion.effective_until == None, TimetableVersion.effective_until >= req.booking_date)
        ).first()

        if not active_version:
            req.conflict_message = "Timetable coverage unverified for this date."
            db.commit()
            raise HTTPException(status_code=409, detail="Cannot approve: Timetable coverage is unverified for this date.")

        # Check conflicting timetable classes
        tt_conflicts = db.query(TimetableEntry).filter(
            TimetableEntry.version_id == active_version.id,
            TimetableEntry.venue_id == venue.id,
            TimetableEntry.day_of_week == day_of_week,
            TimetableEntry.is_active == True,
            TimetableEntry.start_time < req.end_time,
            TimetableEntry.end_time > req.start_time
        ).all()

        if tt_conflicts:
            conflict_info = f"Conflicts with class {tt_conflicts[0].subject.code} ({tt_conflicts[0].start_time} - {tt_conflicts[0].end_time})"
            req.conflict_message = conflict_info
            db.commit()
            raise HTTPException(status_code=409, detail=f"Cannot approve: {conflict_info}")

        # Check conflicting active bookings
        existing_bookings = db.query(Booking).filter(
            Booking.venue_id == venue.id,
            Booking.booking_date == req.booking_date,
            Booking.status == BookingLifecycleStatus.ACTIVE,
            Booking.start_time < req.end_time,
            Booking.end_time > req.start_time
        ).all()

        if existing_bookings:
            conflict_info = f"Another request was approved first for {existing_bookings[0].start_time} - {existing_bookings[0].end_time}."
            req.conflict_message = conflict_info
            db.commit()
            raise HTTPException(status_code=409, detail=f"Conflict: {conflict_info}")

        # Step 7: Create Booking and Occupancy Records
        new_booking = Booking(
            campus_id=venue.campus_id,
            request_id=req.id,
            venue_id=venue.id,
            booked_by_user_id=req.requested_by_user_id,
            booking_date=req.booking_date,
            start_time=req.start_time,
            end_time=req.end_time,
            approved_by_user_id=approver.id,
            status=BookingLifecycleStatus.ACTIVE
        )
        db.add(new_booking)
        db.flush()

        # Concrete timestamptz intervals for resource_occupancy
        start_dt = datetime.combine(req.booking_date, req.start_time, tzinfo=LOCAL_TZ)
        end_dt = datetime.combine(req.booking_date, req.end_time, tzinfo=LOCAL_TZ)

        occupancy = ResourceOccupancy(
            campus_id=venue.campus_id,
            resource_id=venue.id,
            event_type=OccupancyEventType.BOOKING,
            booking_id=new_booking.id,
            starts_at=start_dt,
            ends_at=end_dt,
            is_active=True
        )
        db.add(occupancy)

        # Step 8: Update request status
        req.status = BookingRequestStatus.APPROVED
        req.reviewed_by_user_id = approver.id
        req.reviewed_at = datetime.utcnow()
        req.conflict_message = None
        req.revision += 1

        # Increment resource_day_state data_rev to invalidate old cache
        day_state.data_rev += 1

        # Step 9: Audit and Outbox records
        audit = AuditLog(
            campus_id=venue.campus_id,
            actor_user_id=approver.id,
            action="APPROVE_BOOKING",
            entity_type="booking",
            entity_id=str(new_booking.id),
            details={
                "request_id": str(req.id),
                "venue_name": venue.name,
                "booking_date": str(req.booking_date),
                "start_time": str(req.start_time),
                "end_time": str(req.end_time),
                "purpose": req.purpose
            }
        )
        db.add(audit)

        outbox = OutboxJob(
            campus_id=venue.campus_id,
            event_type="BOOKING_APPROVED",
            payload={
                "booking_id": str(new_booking.id),
                "recipient_id": str(req.requested_by_user_id),
                "venue_name": venue.name,
                "date": str(req.booking_date),
                "time": f"{req.start_time} - {req.end_time}"
            }
        )
        db.add(outbox)

        # Step 10: Commit transaction atomically
        try:
            db.commit()
        except IntegrityError as ie:
            db.rollback()
            # If PostgreSQL btree_gist exclusion constraint was violated
            raise HTTPException(
                status_code=409,
                detail="Database exclusion constraint prevented double-booking: A competing reservation was confirmed concurrently."
            )
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Booking transaction failed: {str(e)}")

        db.refresh(new_booking)
        return new_booking

    @classmethod
    def reject_request(
        cls,
        db: Session,
        approver: User,
        request_id: UUID,
        rejection_reason: str
    ) -> BookingRequest:
        req = db.query(BookingRequest).filter(BookingRequest.id == request_id).with_for_update().first()
        if not req:
            raise HTTPException(status_code=404, detail="Request not found.")
        if req.status != BookingRequestStatus.PENDING:
            raise HTTPException(status_code=400, detail=f"Request is already {req.status.value}.")

        venue = db.query(Venue).filter(Venue.id == req.venue_id).first()
        if not cls.verify_allocation_scope(db, approver, venue):
            raise HTTPException(status_code=403, detail="You do not have allocation authority for this venue.")

        req.status = BookingRequestStatus.REJECTED
        req.rejection_reason = rejection_reason
        req.reviewed_by_user_id = approver.id
        req.reviewed_at = datetime.utcnow()
        req.revision += 1

        audit = AuditLog(
            campus_id=venue.campus_id,
            actor_user_id=approver.id,
            action="REJECT_BOOKING_REQUEST",
            entity_type="booking_request",
            entity_id=str(req.id),
            details={"rejection_reason": rejection_reason}
        )
        db.add(audit)

        outbox = OutboxJob(
            campus_id=venue.campus_id,
            event_type="REQUEST_REJECTED",
            payload={
                "request_id": str(req.id),
                "recipient_id": str(req.requested_by_user_id),
                "reason": rejection_reason
            }
        )
        db.add(outbox)
        db.commit()
        db.refresh(req)
        return req

    @classmethod
    def withdraw_request(cls, db: Session, requester: User, request_id: UUID) -> BookingRequest:
        req = db.query(BookingRequest).filter(BookingRequest.id == request_id).with_for_update().first()
        if not req:
            raise HTTPException(status_code=404, detail="Request not found.")
        if req.requested_by_user_id != requester.id and requester.role != UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="You can only withdraw your own requests.")
        if req.status != BookingRequestStatus.PENDING:
            raise HTTPException(status_code=400, detail=f"Cannot withdraw request in {req.status.value} status.")

        req.status = BookingRequestStatus.WITHDRAWN
        req.revision += 1
        db.commit()
        db.refresh(req)
        return req

    @classmethod
    def cancel_booking(cls, db: Session, actor: User, booking_id: UUID, cancellation_reason: str) -> Booking:
        booking = db.query(Booking).filter(Booking.id == booking_id).with_for_update().first()
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found.")
        if booking.status != BookingLifecycleStatus.ACTIVE:
            return booking  # Repeated cancellation is harmless (idempotent)

        venue = db.query(Venue).filter(Venue.id == booking.venue_id).first()
        # Authorized if requester owner OR scoped allocator OR admin
        is_owner = booking.booked_by_user_id == actor.id
        is_allocator = cls.verify_allocation_scope(db, actor, venue)
        is_admin = actor.role == UserRole.ADMIN

        if not (is_owner or is_allocator or is_admin):
            raise HTTPException(status_code=403, detail="Unauthorized to cancel this booking.")

        booking.status = BookingLifecycleStatus.CANCELLED
        booking.cancellation_reason = cancellation_reason
        booking.cancelled_by_user_id = actor.id
        booking.cancelled_at = datetime.utcnow()

        # Deactivate all occupancy records atomically
        db.query(ResourceOccupancy).filter(
            ResourceOccupancy.booking_id == booking.id
        ).update({"is_active": False})

        # Bump resource_day_state data_rev
        day_state = db.query(ResourceDayState).filter(
            ResourceDayState.campus_id == venue.campus_id,
            ResourceDayState.resource_id == venue.id,
            ResourceDayState.local_date == booking.booking_date
        ).first()
        if day_state:
            day_state.data_rev += 1

        audit = AuditLog(
            campus_id=venue.campus_id,
            actor_user_id=actor.id,
            action="CANCEL_BOOKING",
            entity_type="booking",
            entity_id=str(booking.id),
            details={"cancellation_reason": cancellation_reason}
        )
        db.add(audit)
        db.commit()
        db.refresh(booking)
        return booking
