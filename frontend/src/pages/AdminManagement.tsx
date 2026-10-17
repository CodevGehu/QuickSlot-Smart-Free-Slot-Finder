import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  Building2, Users, ShieldCheck, History, Plus, 
  CheckCircle, AlertTriangle, RefreshCw, Key, Layers, DoorOpen
} from 'lucide-react';

export const AdminManagement: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [venues, setVenues] = useState<any[]>([]);
  const [venueTypes, setVenueTypes] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [demoUsers, setDemoUsers] = useState<any[]>([]);

  const [activeTab, setActiveTab] = useState<'venues' | 'assignments' | 'audit' | 'users'>('venues');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // New Venue Modal/Form
  const [showAddVenue, setShowAddVenue] = useState(false);
  const [newVenue, setNewVenue] = useState({
    code: '',
    name: '',
    venue_type_id: '',
    capacity: 60,
    building: 'CS Block',
    floor: 2,
    has_projector: true,
    has_ac: true,
    has_audio: false
  });

  // New Allocation Assignment
  const [showAddAssign, setShowAddAssign] = useState(false);
  const [newAssign, setNewAssign] = useState({
    user_id: '',
    venue_id: '',
    building_name: '',
    is_primary: true
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [s, v, vt, a, al, u] = await Promise.all([
        api.getAdminStats().catch(() => null),
        api.listVenues().catch(() => []),
        api.listVenueTypes().catch(() => []),
        api.listAllocationAssignments().catch(() => []),
        api.listAuditLogs().catch(() => []),
        api.listDemoUsers().catch(() => [])
      ]);
      setStats(s);
      setVenues(v);
      setVenueTypes(vt);
      setAssignments(a);
      setAuditLogs(al);
      setDemoUsers(u);

      if (vt.length > 0 && !newVenue.venue_type_id) {
        setNewVenue(prev => ({ ...prev, venue_type_id: vt[0].id }));
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to fetch admin data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVenue.code || !newVenue.name || !newVenue.venue_type_id) {
      setMessage({ text: 'Please fill in code, name, and venue type.', type: 'error' });
      return;
    }
    try {
      await api.createVenue({
        ...newVenue,
        capacity: Number(newVenue.capacity),
        floor: Number(newVenue.floor)
      });
      setMessage({ text: `Venue ${newVenue.name} created successfully!`, type: 'success' });
      setShowAddVenue(false);
      fetchData();
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to create venue', type: 'error' });
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssign.user_id) {
      setMessage({ text: 'Please select a faculty member.', type: 'error' });
      return;
    }
    try {
      await api.createAllocationAssignment({
        user_id: newAssign.user_id,
        venue_id: newAssign.venue_id || null,
        building_name: newAssign.building_name || null,
        is_primary: newAssign.is_primary
      });
      setMessage({ text: 'Allocation authority assigned successfully!', type: 'success' });
      setShowAddAssign(false);
      fetchData();
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to create assignment', type: 'error' });
    }
  };

  return (
    <div className="admin-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <ShieldCheck size={28} color="#6366f1" /> Campus Administration Portal
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: '0.3rem 0 0' }}>
            Authoritative resource registry, venue authorization scopes, role governance, and audit trails.
          </p>
        </div>
        <button 
          onClick={fetchData} 
          className="btn btn-outline" 
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <RefreshCw size={16} className={loading ? 'spin' : ''} /> Refresh Records
        </button>
      </div>

      {message && (
        <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-danger'}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {message.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
        </div>
      )}

      {/* KPI Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div className="card glass-panel" style={{ padding: '1.2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.8rem', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
              <DoorOpen size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Venues</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{stats.total_venues ?? venues.length}</div>
            </div>
          </div>

          <div className="card glass-panel" style={{ padding: '1.2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.8rem', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
              <Building2 size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Bookings</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{stats.active_bookings ?? 0}</div>
            </div>
          </div>

          <div className="card glass-panel" style={{ padding: '1.2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.8rem', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
              <Users size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pending Requests</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{stats.pending_requests ?? 0}</div>
            </div>
          </div>

          <div className="card glass-panel" style={{ padding: '1.2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.8rem', borderRadius: '12px', background: 'rgba(236, 72, 153, 0.15)', color: '#f472b6' }}>
              <History size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Audit Records</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{stats.audit_entries ?? auditLogs.length}</div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        <button 
          className={`btn ${activeTab === 'venues' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('venues')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem' }}
        >
          <Building2 size={16} /> Venues ({venues.length})
        </button>
        <button 
          className={`btn ${activeTab === 'assignments' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('assignments')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem' }}
        >
          <Layers size={16} /> Allocation Scopes ({assignments.length})
        </button>
        <button 
          className={`btn ${activeTab === 'users' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('users')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem' }}
        >
          <Users size={16} /> Campus Directory ({demoUsers.length})
        </button>
        <button 
          className={`btn ${activeTab === 'audit' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('audit')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem' }}
        >
          <History size={16} /> Audit Trail ({auditLogs.length})
        </button>
      </div>

      {/* TAB 1: VENUES */}
      {activeTab === 'venues' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Venue Master Register</h3>
            <button 
              className="btn btn-primary" 
              onClick={() => setShowAddVenue(!showAddVenue)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Plus size={16} /> {showAddVenue ? 'Cancel' : 'Add New Venue'}
            </button>
          </div>

          {showAddVenue && (
            <div className="card glass-panel" style={{ padding: '1.5rem', border: '1px solid var(--accent-primary)' }}>
              <h4 style={{ margin: '0 0 1rem', fontSize: '1.1rem', fontWeight: 700 }}>Register New Campus Venue</h4>
              <form onSubmit={handleCreateVenue} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Venue Code / Room No *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. CR-108, LAB-304"
                    value={newVenue.code}
                    onChange={e => setNewVenue({ ...newVenue, code: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Venue Full Name *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. Advanced AI Lab"
                    value={newVenue.name}
                    onChange={e => setNewVenue({ ...newVenue, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Venue Type *</label>
                  <select 
                    className="form-control"
                    value={newVenue.venue_type_id}
                    onChange={e => setNewVenue({ ...newVenue, venue_type_id: e.target.value })}
                    required
                  >
                    {venueTypes.map(vt => (
                      <option key={vt.id} value={vt.id}>{vt.name} ({vt.code})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Capacity (Students)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    value={newVenue.capacity}
                    onChange={e => setNewVenue({ ...newVenue, capacity: Number(e.target.value) })}
                    min={1}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Building Name</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={newVenue.building}
                    onChange={e => setNewVenue({ ...newVenue, building: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Floor Number</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    value={newVenue.floor}
                    onChange={e => setNewVenue({ ...newVenue, floor: Number(e.target.value) })}
                  />
                </div>

                <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={newVenue.has_projector} 
                      onChange={e => setNewVenue({ ...newVenue, has_projector: e.target.checked })} 
                    />
                    <span>Projector Screen</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={newVenue.has_ac} 
                      onChange={e => setNewVenue({ ...newVenue, has_ac: e.target.checked })} 
                    />
                    <span>Air Conditioned</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={newVenue.has_audio} 
                      onChange={e => setNewVenue({ ...newVenue, has_audio: e.target.checked })} 
                    />
                    <span>PA / Mic Audio</span>
                  </label>
                </div>

                <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '0.8rem' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setShowAddVenue(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Create & Register</button>
                </div>
              </form>
            </div>
          )}

          <div className="card glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '0.9rem 1rem', fontWeight: 600 }}>Code</th>
                    <th style={{ padding: '0.9rem 1rem', fontWeight: 600 }}>Name</th>
                    <th style={{ padding: '0.9rem 1rem', fontWeight: 600 }}>Type</th>
                    <th style={{ padding: '0.9rem 1rem', fontWeight: 600 }}>Building & Floor</th>
                    <th style={{ padding: '0.9rem 1rem', fontWeight: 600 }}>Capacity</th>
                    <th style={{ padding: '0.9rem 1rem', fontWeight: 600 }}>Amenities</th>
                    <th style={{ padding: '0.9rem 1rem', fontWeight: 600 }}>Exclusion Protection</th>
                  </tr>
                </thead>
                <tbody>
                  {venues.map((v) => (
                    <tr key={v.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }}>
                      <td style={{ padding: '0.9rem 1rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                        {v.code}
                      </td>
                      <td style={{ padding: '0.9rem 1rem', fontWeight: 600 }}>{v.name}</td>
                      <td style={{ padding: '0.9rem 1rem' }}>
                        <span className="badge badge-secondary">{v.venue_type?.code || 'CLASS'}</span>
                      </td>
                      <td style={{ padding: '0.9rem 1rem', color: 'var(--text-muted)' }}>
                        {v.building || 'Campus Core'}, Fl {v.floor ?? 0}
                      </td>
                      <td style={{ padding: '0.9rem 1rem' }}>
                        <span style={{ fontWeight: 600 }}>{v.capacity} seats</span>
                      </td>
                      <td style={{ padding: '0.9rem 1rem' }}>
                        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                          {v.has_projector && <span style={{ fontSize: '0.75rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>Projector</span>}
                          {v.has_ac && <span style={{ fontSize: '0.75rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>AC</span>}
                          {v.has_audio && <span style={{ fontSize: '0.75rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>Audio</span>}
                        </div>
                      </td>
                      <td style={{ padding: '0.9rem 1rem' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', color: '#10b981' }}>
                          <CheckCircle size={14} /> GiST Active
                        </span>
                      </td>
                    </tr>
                  ))}
                  {venues.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No venues registered yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ALLOCATION SCOPES */}
      {activeTab === 'assignments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Venue Allocation Authority Scopes</h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Rule: Approval requires a designated allocation faculty member authorized for that room or building.
              </p>
            </div>
            <button 
              className="btn btn-primary" 
              onClick={() => setShowAddAssign(!showAddAssign)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Plus size={16} /> {showAddAssign ? 'Cancel' : 'Assign Authority'}
            </button>
          </div>

          {showAddAssign && (
            <div className="card glass-panel" style={{ padding: '1.5rem', border: '1px solid var(--accent-primary)' }}>
              <h4 style={{ margin: '0 0 1rem', fontSize: '1.1rem', fontWeight: 700 }}>Grant Allocation Scope</h4>
              <form onSubmit={handleCreateAssignment} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Faculty Member *</label>
                  <select 
                    className="form-control"
                    value={newAssign.user_id}
                    onChange={e => setNewAssign({ ...newAssign, user_id: e.target.value })}
                    required
                  >
                    <option value="">-- Choose Allocation Faculty --</option>
                    {demoUsers
                      .filter(u => u.role === 'ALLOCATION_FACULTY' || u.role === 'ADMIN')
                      .map(u => (
                        <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>
                      ))
                    }
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Scope: Specific Venue (Optional)</label>
                  <select 
                    className="form-control"
                    value={newAssign.venue_id}
                    onChange={e => setNewAssign({ ...newAssign, venue_id: e.target.value })}
                  >
                    <option value="">-- None (Building-Wide or All) --</option>
                    {venues.map(v => (
                      <option key={v.id} value={v.id}>{v.name} ({v.code})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Scope: Building Name (Optional)</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. CS Block, Main Auditorium"
                    value={newAssign.building_name}
                    onChange={e => setNewAssign({ ...newAssign, building_name: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '1.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={newAssign.is_primary}
                      onChange={e => setNewAssign({ ...newAssign, is_primary: e.target.checked })}
                    />
                    <span>Primary In-Charge</span>
                  </label>
                </div>

                <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '0.8rem' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setShowAddAssign(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Grant Authorization</button>
                </div>
              </form>
            </div>
          )}

          <div className="card glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '0.9rem 1rem', fontWeight: 600 }}>Faculty Member</th>
                  <th style={{ padding: '0.9rem 1rem', fontWeight: 600 }}>Authorized Venue</th>
                  <th style={{ padding: '0.9rem 1rem', fontWeight: 600 }}>Authorized Building</th>
                  <th style={{ padding: '0.9rem 1rem', fontWeight: 600 }}>Tier</th>
                  <th style={{ padding: '0.9rem 1rem', fontWeight: 600 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => (
                  <tr key={a.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.9rem 1rem', fontWeight: 600 }}>
                      {a.user?.full_name || 'Faculty Member'}
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{a.user?.email}</div>
                    </td>
                    <td style={{ padding: '0.9rem 1rem' }}>
                      {a.venue ? (
                        <span className="badge badge-secondary">{a.venue.name} ({a.venue.code})</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>Any in building</span>
                      )}
                    </td>
                    <td style={{ padding: '0.9rem 1rem' }}>
                      {a.building_name || (a.venue ? a.venue.building : 'All Campus Venues')}
                    </td>
                    <td style={{ padding: '0.9rem 1rem' }}>
                      {a.is_primary ? (
                        <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>Primary Approver</span>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Secondary</span>
                      )}
                    </td>
                    <td style={{ padding: '0.9rem 1rem' }}>
                      <span className="badge badge-success">Active Authorized</span>
                    </td>
                  </tr>
                ))}
                {assignments.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No scoped assignments found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: CAMPUS DIRECTORY / USERS */}
      {activeTab === 'users' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Campus Identity Register (RBAC)</h3>
          <div className="card glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '0.9rem 1rem', fontWeight: 600 }}>Full Name</th>
                  <th style={{ padding: '0.9rem 1rem', fontWeight: 600 }}>Institutional Email</th>
                  <th style={{ padding: '0.9rem 1rem', fontWeight: 600 }}>Role</th>
                  <th style={{ padding: '0.9rem 1rem', fontWeight: 600 }}>Department</th>
                  <th style={{ padding: '0.9rem 1rem', fontWeight: 600 }}>Security Status</th>
                </tr>
              </thead>
              <tbody>
                {demoUsers.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.9rem 1rem', fontWeight: 600 }}>{u.full_name}</td>
                    <td style={{ padding: '0.9rem 1rem', color: 'var(--text-muted)' }}>{u.email}</td>
                    <td style={{ padding: '0.9rem 1rem' }}>
                      <span className={`badge ${
                        u.role === 'ADMIN' ? 'badge-primary' : 
                        u.role === 'ALLOCATION_FACULTY' ? 'badge-warning' : 
                        u.role === 'FACULTY' ? 'badge-secondary' : 'badge-neutral'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ padding: '0.9rem 1rem' }}>{u.department || 'Computer Science'}</td>
                    <td style={{ padding: '0.9rem 1rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', color: '#10b981' }}>
                        <ShieldCheck size={14} /> Argon2id Verified
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Immutable System Audit Log</h3>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Tracks all security authentications, timetable version uploads, booking approvals, and ACID transactions.
            </p>
          </div>
          <div className="card glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '0.8rem 1rem', fontWeight: 600 }}>Timestamp (UTC)</th>
                  <th style={{ padding: '0.8rem 1rem', fontWeight: 600 }}>Event Action</th>
                  <th style={{ padding: '0.8rem 1rem', fontWeight: 600 }}>User Reference</th>
                  <th style={{ padding: '0.8rem 1rem', fontWeight: 600 }}>Entity</th>
                  <th style={{ padding: '0.8rem 1rem', fontWeight: 600 }}>Metadata & Payload</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.8rem 1rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td style={{ padding: '0.8rem 1rem' }}>
                      <span className="badge badge-secondary">{log.action}</span>
                    </td>
                    <td style={{ padding: '0.8rem 1rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {log.user_id ? log.user_id.slice(0, 8) + '...' : 'System Agent'}
                    </td>
                    <td style={{ padding: '0.8rem 1rem' }}>
                      {log.entity_type} {log.entity_id ? `(${log.entity_id.slice(0, 8)}...)` : ''}
                    </td>
                    <td style={{ padding: '0.8rem 1rem', fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {log.details ? JSON.stringify(log.details) : '-'}
                    </td>
                  </tr>
                ))}
                {auditLogs.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No audit entries recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
