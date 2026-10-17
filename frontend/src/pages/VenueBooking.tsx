import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Calendar, PlusCircle, Clock, MapPin, Users, CheckCircle, XCircle, AlertCircle, Ban, History } from 'lucide-react';

interface VenueBookingProps {
  initialVenue?: any;
  initialDate?: string;
  initialStart?: string;
  initialEnd?: string;
  currentUser?: any;
}

export const VenueBooking: React.FC<VenueBookingProps> = ({
  initialVenue,
  initialDate,
  initialStart,
  initialEnd,
  currentUser
}) => {
  const [activeTab, setActiveTab] = useState<'new' | 'my-requests' | 'my-bookings'>('new');
  const [venues, setVenues] = useState<any[]>([]);

  // Form State
  const [venueId, setVenueId] = useState<string>(initialVenue?.venue_id || '');
  const [bookingDate, setBookingDate] = useState<string>(initialDate || new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState<string>(initialStart || '17:00');
  const [endTime, setEndTime] = useState<string>(initialEnd || '18:30');
  const [purpose, setPurpose] = useState<string>('Club Technical Workshop');
  const [attendance, setAttendance] = useState<number>(45);
  const [equipment, setEquipment] = useState<string>('Projector, Microphones, Wi-Fi');
  const [clubName, setClubName] = useState<string>('GeekHub Coding Club');

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // My requests & bookings state
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [loadingLists, setLoadingLists] = useState<boolean>(false);

  // Cancellation modal state
  const [cancelModalBooking, setCancelModalBooking] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState<string>('');

  useEffect(() => {
    loadVenues();
    if (activeTab === 'my-requests') loadMyRequests();
    if (activeTab === 'my-bookings') loadMyBookings();
  }, [activeTab]);

  const loadVenues = async () => {
    try {
      const res = await api.listVenues();
      setVenues(res);
      if (!venueId && res.length > 0) {
        setVenueId(res[0].id);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const loadMyRequests = async () => {
    setLoadingLists(true);
    try {
      const res = await api.getMyRequests();
      setMyRequests(res);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingLists(false);
    }
  };

  const loadMyBookings = async () => {
    setLoadingLists(true);
    try {
      const res = await api.getMyBookings();
      setMyBookings(res);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingLists(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const idempotencyKey = `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const payload = {
        venue_id: venueId,
        purpose,
        booking_date: bookingDate,
        start_time: startTime.length === 5 ? `${startTime}:00` : startTime,
        end_time: endTime.length === 5 ? `${endTime}:00` : endTime,
        expected_attendance: Number(attendance),
        required_equipment: equipment,
        participant_group: clubName
      };

      const res = await api.submitBookingRequest(payload, idempotencyKey);
      setMessage({
        type: 'success',
        text: `Booking request submitted successfully (ID: ${res.id.substring(0, 8)}...). Routed to the designated allocation faculty for approval.`
      });
      setActiveTab('my-requests');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Submission failed' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async (reqId: string) => {
    if (!confirm('Are you sure you want to withdraw this pending request?')) return;
    try {
      await api.withdrawRequest(reqId);
      loadMyRequests();
    } catch (err: any) {
      alert(`Withdrawal failed: ${err.message}`);
    }
  };

  const handleCancelBooking = async () => {
    if (!cancelReason.trim()) {
      alert('Please provide a reason for cancellation.');
      return;
    }
    try {
      await api.cancelBooking(cancelModalBooking.id, cancelReason);
      setCancelModalBooking(null);
      setCancelReason('');
      loadMyBookings();
    } catch (err: any) {
      alert(`Cancellation failed: ${err.message}`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Title */}
      <div>
        <h2 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Calendar size={26} color="#818CF8" /> Module C: Club and Event Venue Booking
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '0.25rem' }}>
          Request venues such as KP Nautiyal Auditorium, Open Ground, and New Auditorium with scoped faculty routing and atomic double-booking prevention.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        <button
          className={`btn ${activeTab === 'new' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('new')}
        >
          <PlusCircle size={16} /> New Booking Request
        </button>
        <button
          className={`btn ${activeTab === 'my-requests' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('my-requests')}
        >
          <History size={16} /> My Requests ({myRequests.length})
        </button>
        <button
          className={`btn ${activeTab === 'my-bookings' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('my-bookings')}
        >
          <CheckCircle size={16} /> Confirmed Bookings ({myBookings.length})
        </button>
      </div>

      {/* Alert Messages */}
      {message && (
        <div style={{ padding: '1rem', borderRadius: 'var(--radius-sm)', background: message.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)', border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)'}`, color: message.type === 'success' ? '#34D399' : '#F87171', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <div>{message.text}</div>
        </div>
      )}

      {/* TAB 1: New Booking Request Form */}
      {activeTab === 'new' && (
        <form onSubmit={handleSubmit} className="glass-card" style={{ padding: '2rem', maxWidth: '800px' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PlusCircle size={20} color="#818CF8" /> Submit Allocation Request
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
            <div>
              <label className="form-label">Select Venue</label>
              <select
                className="select-control"
                value={venueId}
                onChange={(e) => setVenueId(e.target.value)}
                required
              >
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.building} • Cap: {v.capacity})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Booking Date</label>
              <input
                type="date"
                className="input-control"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="form-label">Start Time</label>
              <input
                type="time"
                className="input-control"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="form-label">End Time</label>
              <input
                type="time"
                className="input-control"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="form-label">Expected Attendance</label>
              <input
                type="number"
                min="1"
                className="input-control"
                value={attendance}
                onChange={(e) => setAttendance(parseInt(e.target.value) || 1)}
                required
              />
            </div>

            <div>
              <label className="form-label">Club / Student Group</label>
              <input
                type="text"
                className="input-control"
                value={clubName}
                onChange={(e) => setClubName(e.target.value)}
                placeholder="e.g. ACM Student Chapter, Robotics Club"
              />
            </div>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">Event Purpose / Agenda</label>
            <input
              type="text"
              className="input-control"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g. Annual Hackathon Opening Ceremony, Hands-on Lab Session"
              required
            />
          </div>

          <div style={{ marginBottom: '1.75rem' }}>
            <label className="form-label">Required Equipment & Amenities</label>
            <input
              type="text"
              className="input-control"
              value={equipment}
              onChange={(e) => setEquipment(e.target.value)}
              placeholder="e.g. Projector, Microphones, Sound System, LAN"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Submitting to Queue...' : 'Submit Request for Approval'}
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: My Requests */}
      {activeTab === 'my-requests' && (
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1.25rem' }}>My Submitted Requests</h3>

          {loadingLists ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading requests...</div>
          ) : myRequests.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No requests submitted yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {myRequests.map((r) => (
                <div
                  key={r.id}
                  style={{
                    padding: '1.2rem',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1rem'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>{r.venue_name}</span>
                      <span className={`status-pill ${r.status}`}>{r.status}</span>
                    </div>

                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <strong>Purpose:</strong> {r.purpose} • <strong>Group:</strong> {r.participant_group || 'General'} • <strong>Attending:</strong> {r.expected_attendance}
                    </div>

                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '0.35rem' }}>
                      <Clock size={13} style={{ display: 'inline', marginRight: '0.25rem' }} />
                      {r.booking_date} ({r.start_time} - {r.end_time})
                    </div>

                    {r.rejection_reason && (
                      <div style={{ marginTop: '0.5rem', padding: '0.4rem 0.6rem', background: 'rgba(244, 63, 94, 0.1)', color: '#F87171', borderRadius: '4px', fontSize: '0.8rem' }}>
                        <strong>Rejection Reason:</strong> {r.rejection_reason}
                      </div>
                    )}

                    {r.conflict_message && (
                      <div style={{ marginTop: '0.5rem', padding: '0.4rem 0.6rem', background: 'rgba(245, 158, 11, 0.1)', color: '#FBBF24', borderRadius: '4px', fontSize: '0.8rem' }}>
                        <strong>Conflict Note:</strong> {r.conflict_message}
                      </div>
                    )}
                  </div>

                  <div>
                    {r.status === 'PENDING' && (
                      <button className="btn btn-secondary btn-sm" onClick={() => handleWithdraw(r.id)}>
                        <Ban size={14} /> Withdraw
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Confirmed Bookings */}
      {activeTab === 'my-bookings' && (
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1.25rem' }}>My Confirmed Reservations</h3>

          {loadingLists ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading bookings...</div>
          ) : myBookings.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No confirmed bookings yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {myBookings.map((b) => (
                <div
                  key={b.id}
                  style={{
                    padding: '1.2rem',
                    background: b.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                    border: `1px solid ${b.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-color)'}`,
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1rem'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>{b.venue_name}</span>
                      <span className={`status-pill ${b.status === 'ACTIVE' ? 'AVAILABLE' : 'OCCUPIED'}`}>
                        {b.status}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      Building: {b.building} • Approved by: {b.approved_by_name || 'Designated Allocator'}
                    </div>

                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '0.35rem' }}>
                      <Calendar size={13} style={{ display: 'inline', marginRight: '0.25rem' }} />
                      {b.booking_date} ({b.start_time} - {b.end_time})
                    </div>

                    {b.cancellation_reason && (
                      <div style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: '#F87171' }}>
                        Cancelled: {b.cancellation_reason}
                      </div>
                    )}
                  </div>

                  <div>
                    {b.status === 'ACTIVE' && (
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ color: '#F87171', borderColor: 'rgba(244, 63, 94, 0.4)' }}
                        onClick={() => setCancelModalBooking(b)}
                      >
                        Cancel Reservation
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Cancellation Modal */}
      {cancelModalBooking && (
        <div className="modal-backdrop" onClick={() => setCancelModalBooking(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem', color: '#F87171' }}>
              Cancel Confirmed Reservation
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Cancelling <strong>{cancelModalBooking.venue_name}</strong> for {cancelModalBooking.booking_date} ({cancelModalBooking.start_time} - {cancelModalBooking.end_time}).
              This will release the room occupancy atomically and write an immutable audit entry.
            </p>

            <div style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Mandatory Cancellation Reason</label>
              <input
                type="text"
                className="input-control"
                placeholder="e.g. Guest speaker cancelled, rescheduled to next month..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn btn-secondary" onClick={() => setCancelModalBooking(null)}>Keep Booking</button>
              <button className="btn btn-danger" onClick={handleCancelBooking}>Confirm Cancellation</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
