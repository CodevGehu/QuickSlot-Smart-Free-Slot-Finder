import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Search, Calendar, UserCheck, ShieldCheck, Cpu, Database, CheckCircle2, AlertCircle, Building2, Layers } from 'lucide-react';

interface HomePageProps {
  onNavigate: (tab: string) => void;
  currentUser: any;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate, currentUser }) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await api.getAdminStats();
      setStats(data);
    } catch {
      // Fallback defaults if not admin
      setStats({
        total_venues: 9,
        confirmed_bookings: 3,
        pending_requests: 1,
        active_timetable: 'B.Tech CSE V-Semester Official Timetable'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Hero Banner */}
      <div className="glass-card" style={{ padding: '2.5rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'relative', zIndex: 2, maxWidth: '750px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '0.35rem 0.85rem', borderRadius: 'var(--radius-full)', marginBottom: '1.25rem' }}>
            <Database size={14} color="#818CF8" />
            <span style={{ fontSize: '0.78rem', color: '#A5B4FC', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
              POSTGRESQL 18 + ACID CONCURRENCY + OS WORKER
            </span>
          </div>
          
          <h1 style={{ fontSize: '2.4rem', lineHeight: 1.15, marginBottom: '1rem', background: 'linear-gradient(135deg, #FFFFFF 30%, #94A3B8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Campus Free Slot Finder & Academic Space Manager
          </h1>
          
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: '1.75rem' }}>
            Find available lecture theatres and labs without clashing with official class timetables. Check teachers' scheduled venues, submit club event requests, and inspect real-time DBMS locking and OS synchronization guarantees.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
            <button className="btn btn-primary" onClick={() => onNavigate('search')}>
              <Search size={18} /> Find Free Slots Now
            </button>
            <button className="btn btn-secondary" onClick={() => onNavigate('teachers')}>
              <UserCheck size={18} /> Teacher Schedule Finder
            </button>
            <button className="btn btn-secondary" onClick={() => onNavigate('booking')}>
              <Calendar size={18} /> Book Venue / Club Event
            </button>
            <button className="btn btn-secondary" style={{ borderColor: 'rgba(99, 102, 241, 0.4)' }} onClick={() => onNavigate('lab')}>
              <Cpu size={18} color="#818CF8" /> OS & DBMS Concepts Lab
            </button>
          </div>
        </div>

        {/* Decorative background glow */}
        <div style={{ position: 'absolute', right: '-80px', top: '-80px', width: '380px', height: '380px', background: 'radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, transparent 70%)', pointerEvents: 'none' }} />
      </div>

      {/* Quick Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818CF8' }}>
            <Building2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Active Campus Venues</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>{stats?.total_venues || 9}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--status-available)' }}>LTs, Labs, Auditoriums, Grounds</div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34D399' }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Confirmed Bookings</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>{stats?.confirmed_bookings || 2}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ACID-enforced reservations</div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FBBF24' }}>
            <AlertCircle size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Pending Approvals</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>{stats?.pending_requests || 1}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Routed to Allocation Faculty</div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: 'rgba(139, 92, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A78BFA' }}>
            <Layers size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Timetable Schedule</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>
              {stats?.active_timetable || 'B.Tech CSE V-Sem'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--status-available)' }}>Published & Active</div>
          </div>
        </div>
      </div>

      {/* Featured Spaces & Allocation Guide */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
        <div className="glass-card" style={{ padding: '1.75rem' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building2 size={20} color="#818CF8" /> Popular College Venues
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
            Official registered venues subject to designated allocation authority.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ padding: '0.85rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>KP Nautiyal Auditorium</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Main Building | Capacity: 450 | AC, Audio, Projector</div>
              </div>
              <span className="role-badge role-ALLOCATION_FACULTY" style={{ fontSize: '0.7rem' }}>Prof. K.P. Nautiyal</span>
            </div>

            <div style={{ padding: '0.85rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>New Auditorium & 106 (LT)</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>CS Block | Capacity: 600 & 120 | Tiered Lecture Hall</div>
              </div>
              <span className="role-badge role-ALLOCATION_FACULTY" style={{ fontSize: '0.7rem' }}>Dr. Ananya Sharma</span>
            </div>

            <div style={{ padding: '0.85rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Open Ground</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Campus Green | Capacity: 1500 | Sports & Fests</div>
              </div>
              <span className="role-badge role-ALLOCATION_FACULTY" style={{ fontSize: '0.7rem' }}>Prof. K.P. Nautiyal</span>
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.75rem' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={20} color="#34D399" /> System Invariants & Rules
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
            Guarantees enforcing data integrity across concurrent campus workflows:
          </p>

          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.8rem', fontSize: '0.88rem' }}>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
              <CheckCircle2 size={16} color="#34D399" style={{ marginTop: '0.2rem', flexShrink: 0 }} />
              <div><strong>No Double-Bookings:</strong> PostgreSQL 18 <code style={{ color: '#818CF8', fontFamily: 'var(--font-mono)' }}>btree_gist</code> exclusion constraint rejects overlapping bookings at the engine level.</div>
            </li>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
              <CheckCircle2 size={16} color="#34D399" style={{ marginTop: '0.2rem', flexShrink: 0 }} />
              <div><strong>Incomplete Data is Unknown:</strong> Missing timetable coverage is never treated as free time. Status is flagged as <span className="status-pill UNKNOWN" style={{ padding: '0.1rem 0.4rem', fontSize: '0.7rem' }}>UNKNOWN</span>.</div>
            </li>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
              <CheckCircle2 size={16} color="#34D399" style={{ marginTop: '0.2rem', flexShrink: 0 }} />
              <div><strong>No Self-Approval:</strong> Requesters cannot approve their own requests, even if holding the allocator role.</div>
            </li>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
              <CheckCircle2 size={16} color="#34D399" style={{ marginTop: '0.2rem', flexShrink: 0 }} />
              <div><strong>Process Isolation:</strong> Timetable PDF extraction executes in an independent Python OS worker process without blocking API responsiveness.</div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
