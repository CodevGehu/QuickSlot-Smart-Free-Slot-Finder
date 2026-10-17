import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Search, Filter, Calendar, Clock, MapPin, Users, CheckCircle, XCircle, AlertTriangle, HelpCircle, ChevronRight, X, Sparkles } from 'lucide-react';

interface FreeSlotFinderProps {
  onSelectVenueForBooking?: (venue: any, date: string, startTime: string, endTime: string) => void;
}

export const FreeSlotFinder: React.FC<FreeSlotFinderProps> = ({ onSelectVenueForBooking }) => {
  const [targetDate, setTargetDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState<string>('10:10');
  const [endTime, setEndTime] = useState<string>('11:05');
  const [duration, setDuration] = useState<string>('');
  const [venueType, setVenueType] = useState<string>('');
  const [building, setBuilding] = useState<string>('');
  const [minCapacity, setMinCapacity] = useState<string>('');
  const [feature, setFeature] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<any>(null);
  const [selectedVenue, setSelectedVenue] = useState<any>(null);

  useEffect(() => {
    handleSearch();
  }, []);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const params: any = { target_date: targetDate };
      if (startTime && endTime) {
        params.start_time = startTime.length === 5 ? `${startTime}:00` : startTime;
        params.end_time = endTime.length === 5 ? `${endTime}:00` : endTime;
      }
      if (duration) params.duration_minutes = parseInt(duration);
      if (venueType) params.venue_type = venueType;
      if (building) params.building = building;
      if (minCapacity) params.min_capacity = parseInt(minCapacity);
      if (feature) params.features = feature;

      const res = await api.searchAvailability(params);
      setData(res);
    } catch (err: any) {
      alert(`Search error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const applyPreset = (preset: string) => {
    if (preset === 'p3') {
      setStartTime('10:10');
      setEndTime('11:05');
      setDuration('');
    } else if (preset === 'afternoon') {
      setStartTime('14:10');
      setEndTime('16:00');
      setDuration('');
    } else if (preset === 'evening') {
      setStartTime('16:00');
      setEndTime('17:50');
      setDuration('');
    } else if (preset === '60min') {
      setStartTime('');
      setEndTime('');
      setDuration('60');
    }
  };

  const renderStatusBadge = (state: string) => {
    switch (state) {
      case 'AVAILABLE':
        return <span className="status-pill AVAILABLE"><CheckCircle size={13} /> AVAILABLE</span>;
      case 'OCCUPIED':
        return <span className="status-pill OCCUPIED"><XCircle size={13} /> OCCUPIED</span>;
      case 'RESTRICTED':
        return <span className="status-pill RESTRICTED"><AlertTriangle size={13} /> RESTRICTED</span>;
      case 'UNKNOWN':
      default:
        return <span className="status-pill UNKNOWN"><HelpCircle size={13} /> UNKNOWN</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Title & Summary */}
      <div>
        <h2 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Search size={26} color="#818CF8" /> Module A: Free Slot Finder
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '0.25rem' }}>
          Search classrooms, lecture theatres, and laboratories across half-open intervals <code style={{ fontFamily: 'var(--font-mono)', color: '#818CF8' }}>[start, end)</code> with verified timetable coverage checks.
        </p>
      </div>

      {/* Search Filter Controls */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <label className="form-label">Target Date</label>
            <input
              type="date"
              className="input-control"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>

          <div>
            <label className="form-label">Start Time</label>
            <input
              type="time"
              className="input-control"
              value={startTime}
              onChange={(e) => { setStartTime(e.target.value); setDuration(''); }}
            />
          </div>

          <div>
            <label className="form-label">End Time</label>
            <input
              type="time"
              className="input-control"
              value={endTime}
              onChange={(e) => { setEndTime(e.target.value); setDuration(''); }}
            />
          </div>

          <div>
            <label className="form-label">Building</label>
            <select className="select-control" value={building} onChange={(e) => setBuilding(e.target.value)}>
              <option value="">All Buildings</option>
              <option value="CS Block">CS Block</option>
              <option value="Main Building">Main Building</option>
              <option value="Engineering Block">Engineering Block</option>
              <option value="Management Block">Management Block</option>
              <option value="Campus Green">Campus Green</option>
            </select>
          </div>

          <div>
            <label className="form-label">Space Type</label>
            <select className="select-control" value={venueType} onChange={(e) => setVenueType(e.target.value)}>
              <option value="">All Types</option>
              <option value="Lecture Theatre">Lecture Theatre</option>
              <option value="Laboratory">Laboratory</option>
              <option value="Classroom">Classroom</option>
              <option value="Auditorium">Auditorium</option>
              <option value="Open Ground">Open Ground</option>
              <option value="Seminar Hall">Seminar Hall</option>
            </select>
          </div>

          <div>
            <label className="form-label">Min Capacity</label>
            <input
              type="number"
              placeholder="e.g. 50"
              className="input-control"
              value={minCapacity}
              onChange={(e) => setMinCapacity(e.target.value)}
            />
          </div>
        </div>

        {/* Presets and Search Button */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>QUICK PRESETS:</span>
            <button className="btn btn-secondary btn-sm" onClick={() => applyPreset('p3')}>Period 3 (10:10 - 11:05)</button>
            <button className="btn btn-secondary btn-sm" onClick={() => applyPreset('afternoon')}>Lab Slot 1 (14:10 - 16:00)</button>
            <button className="btn btn-secondary btn-sm" onClick={() => applyPreset('evening')}>Lab Slot 2 (16:00 - 17:50)</button>
            <button className="btn btn-secondary btn-sm" onClick={() => applyPreset('60min')}>Any 60m Free Block</button>
          </div>

          <button className="btn btn-primary" onClick={handleSearch} disabled={loading} style={{ minWidth: '160px' }}>
            {loading ? 'Evaluating...' : <><Search size={16} /> Search Venues</>}
          </button>
        </div>
      </div>

      {/* Results Header with Counts */}
      {data && (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', background: 'rgba(15, 23, 42, 0.4)', padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Showing <strong>{data.total_venues}</strong> venues for <strong style={{ color: 'var(--text-primary)' }}>{data.query_date}</strong> {data.search_window && <span>({data.search_window})</span>}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <span className="status-pill AVAILABLE">{data.available_count} Free</span>
            <span className="status-pill OCCUPIED">{data.occupied_count} Occupied</span>
            <span className="status-pill RESTRICTED">{data.restricted_count} Restricted</span>
            <span className="status-pill UNKNOWN">{data.unknown_count} Unknown</span>
          </div>
        </div>
      )}

      {/* Venues Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {data?.venues?.map((v: any) => (
          <div
            key={v.venue_id}
            className="glass-card"
            style={{
              padding: '1.25rem',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '1rem',
              borderColor: selectedVenue?.venue_id === v.venue_id ? 'var(--primary)' : 'var(--border-color)'
            }}
            onClick={() => setSelectedVenue(v)}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <h3 style={{ fontSize: '1.15rem' }}>{v.venue_name}</h3>
                {renderStatusBadge(v.state)}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '0.75rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><MapPin size={13} /> {v.building}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Users size={13} /> Cap: {v.capacity}</span>
                <span>Type: {v.venue_type}</span>
              </div>

              {/* State Reason */}
              <div style={{ fontSize: '0.82rem', color: v.state === 'AVAILABLE' ? 'var(--status-available)' : v.state === 'OCCUPIED' ? '#FCA5A5' : 'var(--text-muted)', background: 'rgba(0, 0, 0, 0.25)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', borderLeft: `3px solid ${v.state === 'AVAILABLE' ? 'var(--status-available)' : v.state === 'OCCUPIED' ? 'var(--status-occupied)' : 'var(--status-unknown)'}` }}>
                {v.state_reason}
              </div>

              {/* Features Tags */}
              {v.features && v.features.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.75rem' }}>
                  {v.features.map((f: string, i: number) => (
                    <span key={i} style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)' }}>
                      {f}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {v.free_intervals?.length || 0} free blocks today
              </span>
              <span style={{ fontSize: '0.8rem', color: '#818CF8', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                Inspect schedule <ChevronRight size={14} />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Selected Venue Details Drawer / Modal */}
      {selectedVenue && (
        <div className="modal-backdrop" onClick={() => setSelectedVenue(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.4rem' }}>{selectedVenue.venue_name}</h3>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {selectedVenue.building} (Floor {selectedVenue.floor}) • Capacity: {selectedVenue.capacity} • {selectedVenue.venue_type}
                </div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedVenue(null)}><X size={16} /></button>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span className="form-label" style={{ margin: 0 }}>Availability Status</span>
                {renderStatusBadge(selectedVenue.state)}
              </div>
              <div style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.3)', borderRadius: 'var(--radius-sm)', fontSize: '0.88rem' }}>
                {selectedVenue.state_reason}
              </div>
            </div>

            {/* Busy Intervals / Timetable Classes */}
            <div style={{ marginBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '0.95rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                Scheduled Timetable Classes & Bookings ({selectedVenue.busy_intervals?.length || 0})
              </h4>
              {selectedVenue.busy_intervals?.length === 0 ? (
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>No scheduled sessions occupying this venue on this date.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto' }}>
                  {selectedVenue.busy_intervals.map((b: any, idx: number) => (
                    <div key={idx} style={{ padding: '0.6rem 0.85rem', background: 'rgba(244, 63, 94, 0.08)', borderLeft: '3px solid var(--status-occupied)', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{b.title}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{b.details}</div>
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: '#FCA5A5', fontWeight: 600 }}>
                        {b.start_time} - {b.end_time}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Free Intervals */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.95rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                Continuous Free Blocks
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {selectedVenue.free_intervals?.map((f: any, idx: number) => (
                  <span key={idx} style={{ padding: '0.35rem 0.75rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', color: '#34D399', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem', fontFamily: 'var(--font-mono)' }}>
                    {f.start_time} - {f.end_time} ({f.duration_minutes}m)
                  </span>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedVenue(null)}>Close</button>
              {onSelectVenueForBooking && selectedVenue.state === 'AVAILABLE' && (
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    onSelectVenueForBooking(selectedVenue, targetDate, startTime, endTime);
                    setSelectedVenue(null);
                  }}
                >
                  Book This Space Now
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
