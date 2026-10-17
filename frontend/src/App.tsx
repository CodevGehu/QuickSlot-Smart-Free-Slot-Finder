import React, { useState, useEffect } from 'react';
import { api } from './services/api';
import { HomePage } from './pages/HomePage';
import { FreeSlotFinder } from './pages/FreeSlotFinder';
import { TeacherFinder } from './pages/TeacherFinder';
import { VenueBooking } from './pages/VenueBooking';
import { AllocationInbox } from './pages/AllocationInbox';
import { TimetableAdmin } from './pages/TimetableAdmin';
import { AdminManagement } from './pages/AdminManagement';
import { OsDbmsLab } from './pages/OsDbmsLab';

import { 
  Compass, Search, UserCheck, CalendarDays, Inbox, 
  UploadCloud, Settings, Terminal, Shield, RefreshCw,
  LogOut, User, CheckCircle2, ChevronDown, Sparkles
} from 'lucide-react';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('home');
  const [switchingRole, setSwitchingRole] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const fetchCurrentUser = async () => {
    try {
      const user = await api.getMe();
      setCurrentUser(user);
    } catch {
      // If not logged in, auto-login as Student demo by default
      try {
        const demo = await api.switchDemoRole('STUDENT');
        setCurrentUser(demo.user);
      } catch (err) {
        console.error('Failed to initialize demo session', err);
      }
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const handleRoleSwitch = async (role: string) => {
    setSwitchingRole(true);
    setShowRoleMenu(false);
    try {
      const res = await api.switchDemoRole(role);
      setCurrentUser(res.user);
      // If student switches to admin tabs, redirect safely
      if (role === 'STUDENT' && (activeTab === 'timetable' || activeTab === 'admin' || activeTab === 'inbox')) {
        setActiveTab('finder');
      }
    } catch (err: any) {
      alert(`Role switch error: ${err.message}`);
    } finally {
      setSwitchingRole(false);
    }
  };

  const navItems = [
    { id: 'home', label: 'Overview', icon: Compass },
    { id: 'finder', label: 'Free Slot Finder', icon: Search },
    { id: 'teachers', label: 'Teacher Lookup', icon: UserCheck },
    { id: 'booking', label: 'Venue Request', icon: CalendarDays },
    { 
      id: 'inbox', 
      label: 'Allocation Inbox', 
      icon: Inbox,
      requiresRole: ['ALLOCATION_FACULTY', 'ADMIN']
    },
    { 
      id: 'timetable', 
      label: 'Timetable Manager', 
      icon: UploadCloud,
      requiresRole: ['ADMIN']
    },
    { 
      id: 'admin', 
      label: 'Campus Admin', 
      icon: Settings,
      requiresRole: ['ADMIN']
    },
    { id: 'lab', label: 'OS & DBMS Lab', icon: Terminal, highlight: true },
  ];

  const currentRole = currentUser?.role || 'STUDENT';

  return (
    <div className="app-layout" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navbar */}
      <header className="navbar glass-panel" style={{ 
        position: 'sticky', 
        top: 0, 
        zIndex: 100, 
        padding: '0.75rem 2rem', 
        borderBottom: '1px solid var(--border-color)',
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        backdropFilter: 'blur(16px)'
      }}>
        {/* Logo and Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer' }} onClick={() => setActiveTab('home')}>
          <div style={{ 
            width: '38px', 
            height: '38px', 
            borderRadius: '10px', 
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 800,
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)'
          }}>
            CF
          </div>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>Campus Free Slot Finder</span>
              <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', fontWeight: 700 }}>
                OS + DBMS
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Graphic Era Hill University • Academic System
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          {navItems.map(item => {
            if (item.requiresRole && !item.requiresRole.includes(currentRole)) {
              return null;
            }
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`btn ${isActive ? 'btn-primary' : 'btn-ghost'}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  fontSize: '0.85rem',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '8px',
                  background: isActive 
                    ? (item.highlight ? 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)' : 'var(--accent-primary)') 
                    : (item.highlight ? 'rgba(236, 72, 153, 0.15)' : 'transparent'),
                  color: isActive ? '#fff' : (item.highlight ? '#f472b6' : 'var(--text-muted)'),
                  border: item.highlight && !isActive ? '1px solid rgba(236, 72, 153, 0.3)' : 'none',
                  fontWeight: isActive ? 700 : 500,
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Demo Role Switcher Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="btn btn-outline"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              padding: '0.4rem 0.8rem',
              borderRadius: '20px',
              fontSize: '0.82rem',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-color)'
            }}
          >
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: currentRole === 'ADMIN' ? '#6366f1' : currentRole === 'ALLOCATION_FACULTY' ? '#f59e0b' : currentRole === 'FACULTY' ? '#38bdf8' : '#10b981'
            }} />
            <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
              <div style={{ fontWeight: 700 }}>{currentUser?.full_name?.split(' ')[0] || 'User'}</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{currentRole}</div>
            </div>
            <ChevronDown size={14} />
          </button>

          {showRoleMenu && (
            <div className="card glass-panel" style={{
              position: 'absolute',
              right: 0,
              top: '110%',
              width: '260px',
              padding: '0.6rem',
              zIndex: 200,
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '0.4rem 0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Simulate Demo Role (RBAC)
              </div>

              {[
                { role: 'STUDENT', name: 'Rohan Sharma', desc: 'Book requests, view availability', color: '#10b981' },
                { role: 'FACULTY', name: 'Dr. Verma', desc: 'Faculty schedule & requests', color: '#38bdf8' },
                { role: 'ALLOCATION_FACULTY', name: 'Prof. Nautiyal', desc: 'Approve scoped venues', color: '#f59e0b' },
                { role: 'ADMIN', name: 'Dr. Dean Academic', desc: 'Full timetable & campus control', color: '#6366f1' }
              ].map(opt => (
                <div
                  key={opt.role}
                  onClick={() => handleRoleSwitch(opt.role)}
                  style={{
                    padding: '0.6rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    background: currentRole === opt.role ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.background = currentRole === opt.role ? 'rgba(99, 102, 241, 0.15)' : 'transparent')}
                >
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: opt.color }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{opt.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{opt.role} • {opt.desc}</div>
                  </div>
                  {currentRole === opt.role && <CheckCircle2 size={16} color="#10b981" />}
                </div>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Main View Body */}
      <main style={{ flex: 1, padding: '2rem', maxWidth: '1400px', width: '100%', margin: '0 auto' }}>
        {activeTab === 'home' && <HomePage onNavigate={(tab) => setActiveTab(tab)} currentUser={currentUser} />}
        {activeTab === 'finder' && <FreeSlotFinder />}
        {activeTab === 'teachers' && <TeacherFinder />}
        {activeTab === 'booking' && <VenueBooking currentUser={currentUser} />}
        {activeTab === 'inbox' && <AllocationInbox currentUser={currentUser} />}
        {activeTab === 'timetable' && <TimetableAdmin />}
        {activeTab === 'admin' && <AdminManagement />}
        {activeTab === 'lab' && <OsDbmsLab />}
      </main>

      {/* Footer */}
      <footer style={{ 
        borderTop: '1px solid var(--border-color)', 
        padding: '1.5rem 2rem', 
        fontSize: '0.8rem', 
        color: 'var(--text-muted)',
        background: 'rgba(0, 0, 0, 0.2)'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <strong>Campus Free Slot Finder</strong> — Full-Stack OS & DBMS Project Based Learning
            <div>Graphic Era Hill University • Academic Session 2025-2026</div>
          </div>
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <span className="badge badge-secondary">PostgreSQL 18 btree_gist</span>
            <span className="badge badge-secondary">ACID Approval Advisory Locks</span>
            <span className="badge badge-secondary">Durable Queue Worker</span>
            <span className="badge badge-secondary">FCFS & Deadlock Lab</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
