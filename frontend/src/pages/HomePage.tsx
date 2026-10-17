import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { 
  Search, Calendar, UserCheck, CheckCircle2, 
  Building2, Clock, MapPin, ArrowRight
} from 'lucide-react';

interface HomePageProps {
  onNavigate: (tab: string) => void;
  currentUser: any;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRealStats();
  }, []);

  const loadRealStats = async () => {
    try {
      const data = await api.getOverviewSummary();
      setStats(data);
    } catch (err) {
      console.error('Failed to load overview summary:', err);
      // Empty fallback — no fabricated values
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Clean University Hero Banner */}
      <div className="card glass-panel" style={{ 
        padding: '2.5rem', 
        borderRadius: '16px',
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)',
        border: '1px solid var(--border-color)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ maxWidth: '780px', position: 'relative', zIndex: 2 }}>
          <div style={{ 
            fontSize: '0.85rem', 
            fontWeight: 700, 
            color: '#818cf8', 
            textTransform: 'uppercase', 
            letterSpacing: '0.08em',
            marginBottom: '0.5rem' 
          }}>
            Graphic Era Hill University, Dehradun • Department of CSE
          </div>

          <h1 style={{ 
            fontSize: '2.2rem', 
            fontWeight: 800, 
            letterSpacing: '-0.02em', 
            lineHeight: 1.2, 
            margin: '0 0 0.8rem 0',
            color: '#ffffff'
          }}>
            Campus Free Slot & Space Finder
          </h1>

          <p style={{ 
            color: 'var(--text-secondary)', 
            fontSize: '1.05rem', 
            lineHeight: 1.6, 
            margin: '0 0 1.8rem 0' 
          }}>
            Quickly locate unoccupied classrooms and laboratories, view teachers' scheduled lecture venues, and submit venue requests for academic and student club activities.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
            <button 
              className="btn btn-primary" 
              onClick={() => onNavigate('finder')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.4rem', fontSize: '0.95rem' }}
            >
              <Search size={18} /> Find Free Slots
            </button>

            <button 
              className="btn btn-outline" 
              onClick={() => onNavigate('teachers')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.4rem', fontSize: '0.95rem' }}
            >
              <UserCheck size={18} /> Teacher Schedule Lookup
            </button>

            <button 
              className="btn btn-ghost" 
              onClick={() => onNavigate('booking')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}
            >
              <Calendar size={16} /> Request a Venue <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Subtle background glow */}
        <div style={{
          position: 'absolute',
          right: '-60px',
          top: '-60px',
          width: '320px',
          height: '320px',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.18) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />
      </div>

      {/* Real Live Database Statistics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
        {/* Card 1: Registered Venues */}
        <div className="card glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ 
            width: '46px', 
            height: '46px', 
            borderRadius: '12px', 
            background: 'rgba(99, 102, 241, 0.15)', 
            color: '#818cf8', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            <Building2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Registered Venues
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>
              {loading ? '...' : (stats?.total_venues ?? '—')}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Classrooms, Labs & Auditoriums
            </div>
          </div>
        </div>

        {/* Card 2: Confirmed Bookings */}
        <div className="card glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ 
            width: '46px', 
            height: '46px', 
            borderRadius: '12px', 
            background: 'rgba(16, 185, 129, 0.15)', 
            color: '#34d399', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Confirmed Bookings
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>
              {loading ? '...' : (stats?.confirmed_bookings ?? '0')}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Active space allocations
            </div>
          </div>
        </div>

        {/* Card 3: Pending Requests */}
        <div className="card glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ 
            width: '46px', 
            height: '46px', 
            borderRadius: '12px', 
            background: 'rgba(245, 158, 11, 0.15)', 
            color: '#fbbf24', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            <Clock size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Pending Requests
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>
              {loading ? '...' : (stats?.pending_requests ?? '0')}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Awaiting faculty review
            </div>
          </div>
        </div>

        {/* Card 4: Published Timetable */}
        <div className="card glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ 
            width: '46px', 
            height: '46px', 
            borderRadius: '12px', 
            background: 'rgba(168, 85, 247, 0.15)', 
            color: '#c084fc', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            <Calendar size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Active Timetable
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
              {loading ? '...' : (stats?.active_timetable || 'Published Timetable')}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 600 }}>
              18 Sections • Official Active
            </div>
          </div>
        </div>
      </div>

      {/* Fast Navigation & Information Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
        {/* Core Campus Venues */}
        <div className="card glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building2 size={18} color="#818cf8" /> Key Campus Venues
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 1rem 0' }}>
            Venues registered under official academic timetable and allocation governance:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <div style={{ padding: '0.75rem 1rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>KP Nautiyal Auditorium</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Main Building • 450 seats • In-Charge: Prof. K.P. Nautiyal</div>
              </div>
              <span className="badge badge-secondary">Auditorium</span>
            </div>

            <div style={{ padding: '0.75rem 1rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Lecture Theatres 106, 124, 206, 224</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>CS Block • 120 seats each • In-Charge: Dr. Chandradeep Bhatt</div>
              </div>
              <span className="badge badge-secondary">Lecture Hall</span>
            </div>

            <div style={{ padding: '0.75rem 1rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Computing Labs (302-A, 102-A/B, 002-A/B)</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>CS Block • 40 workstations each • Air Conditioned</div>
              </div>
              <span className="badge badge-secondary">Laboratory</span>
            </div>

            <div style={{ padding: '0.75rem 1rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Open Ground & Campus Green</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Campus Green • Outdoor Festival Arena • 1500 capacity</div>
              </div>
              <span className="badge badge-secondary">Ground</span>
            </div>
          </div>
        </div>

        {/* Operating Guidelines & Policies */}
        <div className="card glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapPin size={18} color="#34d399" /> Campus Booking Guidelines
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 1rem 0' }}>
            Standard rules governing venue reservations and schedule integrity:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.88rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
              <CheckCircle2 size={16} color="#34d399" style={{ marginTop: '0.2rem', flexShrink: 0 }} />
              <div>
                <strong>Timetable Priority:</strong> Regularly scheduled lectures and laboratory practicals always take precedence over ad-hoc event bookings.
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
              <CheckCircle2 size={16} color="#34d399" style={{ marginTop: '0.2rem', flexShrink: 0 }} />
              <div>
                <strong>Faculty Authorization:</strong> Booking requests must be approved by the designated faculty in-charge authorized for the specific room or building.
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
              <CheckCircle2 size={16} color="#34d399" style={{ marginTop: '0.2rem', flexShrink: 0 }} />
              <div>
                <strong>Conflict Protection:</strong> Two conflicting requests cannot reserve the same venue slot simultaneously. Confirmed bookings are immediately marked occupied.
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
              <CheckCircle2 size={16} color="#34d399" style={{ marginTop: '0.2rem', flexShrink: 0 }} />
              <div>
                <strong>Teacher Location:</strong> The Teacher Lookup feature displays scheduled timetable rooms and free consultation periods, not real-time GPS location.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
