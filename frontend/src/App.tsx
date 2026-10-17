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
  UploadCloud, Settings, Terminal, Shield, ChevronDown, 
  CheckCircle2, Sparkles, User, ShieldAlert
} from 'lucide-react';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('home');
  const [switchingRole, setSwitchingRole] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showAdminMenu, setShowAdminMenu] = useState(false);

  const fetchCurrentUser = async () => {
    try {
      const user = await api.getMe();
      setCurrentUser(user);
    } catch {
      // Auto-initialize as Student demo by default
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
    setShowAdminMenu(false);
    try {
      const res = await api.switchDemoRole(role);
      setCurrentUser(res.user);
      if (role === 'STUDENT' && (activeTab === 'timetable' || activeTab === 'admin' || activeTab === 'inbox')) {
        setActiveTab('finder');
      }
    } catch (err: any) {
      alert(`Role switch error: ${err.message}`);
    } finally {
      setSwitchingRole(false);
    }
  };

  const currentRole = currentUser?.role || 'STUDENT';
  const isAdmin = currentRole === 'ADMIN';
  const isAllocationFaculty = currentRole === 'ALLOCATION_FACULTY' || isAdmin;

  // 5 Main Navigation Items per requirements
  const mainNavItems = [
    { id: 'home', label: 'Overview', icon: Compass },
    { id: 'finder', label: 'Free Slot Finder', icon: Search },
    { id: 'teachers', label: 'Teacher Lookup', icon: UserCheck },
    { id: 'booking', label: 'Venue Booking', icon: CalendarDays },
    { id: 'lab', label: 'OS & DBMS Lab', icon: Terminal, highlight: true },
  ];

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
        {/* Brand & Institution Header */}
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
            GE
          </div>
          <div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>Campus Free Slot Finder</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Graphic Era Hill University, Dehradun
            </div>
          </div>
        </div>

        {/* Focused 5-Item Navigation Tabs */}
        <nav style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
          {mainNavItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setShowAdminMenu(false); }}
                className={`btn ${isActive ? 'btn-primary' : 'btn-ghost'}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  fontSize: '0.85rem',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '8px',
                  background: isActive 
                    ? (item.highlight ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : 'var(--accent-primary)') 
                    : (item.highlight ? 'rgba(99, 102, 241, 0.12)' : 'transparent'),
                  color: isActive ? '#fff' : (item.highlight ? '#818cf8' : 'var(--text-muted)'),
                  border: item.highlight && !isActive ? '1px solid rgba(99, 102, 241, 0.25)' : 'none',
                  fontWeight: isActive ? 700 : 500,
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </button>
            );
          })}

          {/* Allocation Inbox for Faculty / Approvers */}
          {isAllocationFaculty && (
            <button
              onClick={() => { setActiveTab('inbox'); setShowAdminMenu(false); }}
              className={`btn ${activeTab === 'inbox' ? 'btn-primary' : 'btn-ghost'}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                fontSize: '0.85rem',
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                fontWeight: activeTab === 'inbox' ? 700 : 500,
                color: activeTab === 'inbox' ? '#fff' : '#fbbf24'
              }}
            >
              <Inbox size={16} />
              <span>Approvals</span>
            </button>
          )}

          {/* Separate Administration Dropdown for Administrators */}
          {isAdmin && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowAdminMenu(!showAdminMenu)}
                className={`btn ${activeTab === 'timetable' || activeTab === 'admin' ? 'btn-primary' : 'btn-ghost'}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  fontSize: '0.85rem',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '8px',
                  fontWeight: (activeTab === 'timetable' || activeTab === 'admin') ? 700 : 500
                }}
              >
                <Settings size={16} />
                <span>Administration</span>
                <ChevronDown size={14} />
              </button>

              {showAdminMenu && (
                <div className="card glass-panel" style={{
                  position: 'absolute',
                  left: 0,
                  top: '110%',
                  width: '210px',
                  padding: '0.4rem',
                  zIndex: 200,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  border: '1px solid var(--border-color)'
                }}>
                  <div 
                    onClick={() => { setActiveTab('timetable'); setShowAdminMenu(false); }}
                    style={{
                      padding: '0.5rem 0.75rem',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      fontSize: '0.85rem',
                      fontWeight: activeTab === 'timetable' ? 700 : 500,
                      background: activeTab === 'timetable' ? 'rgba(99, 102, 241, 0.15)' : 'transparent'
                    }}
                  >
                    <UploadCloud size={16} /> Timetable Ingestion
                  </div>

                  <div 
                    onClick={() => { setActiveTab('admin'); setShowAdminMenu(false); }}
                    style={{
                      padding: '0.5rem 0.75rem',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      fontSize: '0.85rem',
                      fontWeight: activeTab === 'admin' ? 700 : 500,
                      background: activeTab === 'admin' ? 'rgba(99, 102, 241, 0.15)' : 'transparent'
                    }}
                  >
                    <Settings size={16} /> Campus Master Register
                  </div>
                </div>
              )}
            </div>
          )}
        </nav>

        {/* Demo Persona Switcher */}
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
              width: '270px',
              padding: '0.6rem',
              zIndex: 200,
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '0.4rem 0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Simulate University Persona
              </div>

              {[
                { role: 'STUDENT', name: 'Rohan Sharma', desc: 'Student Club Lead • Bookings', color: '#10b981' },
                { role: 'FACULTY', name: 'Dr. Aashish Garg', desc: 'Faculty (OS & CEC)', color: '#38bdf8' },
                { role: 'ALLOCATION_FACULTY', name: 'Dr. Chandradeep Bhatt', desc: 'Allocation Faculty (CS Block)', color: '#f59e0b' },
                { role: 'ADMIN', name: 'Dr. Dean Academic', desc: 'Campus Administration & Timetable', color: '#6366f1' }
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

      {/* Main Content Area */}
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

      {/* Clean University Footer */}
      <footer style={{ 
        borderTop: '1px solid var(--border-color)', 
        padding: '1.25rem 2rem', 
        fontSize: '0.8rem', 
        color: 'var(--text-muted)',
        background: 'rgba(0, 0, 0, 0.2)'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <strong>Graphic Era Hill University, Dehradun</strong> — Department of Computer Science & Engineering
            <div>Campus Free Slot Finder • Academic Session 2026-2027</div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            <span>B.Tech CSE Semester V</span>
            <span>•</span>
            <span>18 Sections Active</span>
            <span>•</span>
            <span>PostgreSQL 18 btree_gist</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
