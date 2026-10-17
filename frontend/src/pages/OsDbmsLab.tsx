import React, { useState } from 'react';
import { api } from '../services/api';
import { 
  Cpu, Database, ShieldAlert, Zap, Play, CheckCircle2, 
  XCircle, ArrowRight, Activity, Terminal, Lock, RefreshCw, BarChart2
} from 'lucide-react';

export const OsDbmsLab: React.FC = () => {
  const [activeModule, setActiveModule] = useState<'concurrency' | 'fcfs' | 'deadlock' | 'sync'>('concurrency');

  // Concurrency Race State
  const [numThreads, setNumThreads] = useState(20);
  const [raceLoading, setRaceLoading] = useState(false);
  const [raceResult, setRaceResult] = useState<any>(null);

  // FCFS Scheduling State
  const [fcfsJobs, setFcfsJobs] = useState([
    { id: 'Req-A (Auditorium)', arrival_time: 0, burst_time: 4 },
    { id: 'Req-B (Robotics Lab)', arrival_time: 1, burst_time: 3 },
    { id: 'Req-C (Seminar Hall)', arrival_time: 2, burst_time: 5 },
    { id: 'Req-D (Room 106)', arrival_time: 4, burst_time: 2 }
  ]);
  const [fcfsLoading, setFcfsLoading] = useState(false);
  const [fcfsResult, setFcfsResult] = useState<any>(null);

  // Deadlock Simulation State
  const [deadlockMode, setDeadlockMode] = useState<'deadlock' | 'prevent'>('deadlock');
  const [deadlockLoading, setDeadlockLoading] = useState(false);
  const [deadlockResult, setDeadlockResult] = useState<any>(null);

  // Multithreading Mutex State
  const [syncThreads, setSyncThreads] = useState(10);
  const [syncIncrements, setSyncIncrements] = useState(5000);
  const [useMutex, setUseMutex] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);

  // Concurrency runner
  const handleRunRace = async () => {
    setRaceLoading(true);
    setRaceResult(null);
    try {
      const res = await api.runConcurrencyRace(numThreads);
      setRaceResult(res);
    } catch (err: any) {
      alert(`Simulation failed: ${err.message}`);
    } finally {
      setRaceLoading(false);
    }
  };

  // FCFS runner
  const handleRunFcfs = async () => {
    setFcfsLoading(true);
    try {
      const res = await api.runFCFS(fcfsJobs);
      setFcfsResult(res);
    } catch (err: any) {
      alert(`FCFS calculation failed: ${err.message}`);
    } finally {
      setFcfsLoading(false);
    }
  };

  // Deadlock runner
  const handleRunDeadlock = async () => {
    setDeadlockLoading(true);
    setDeadlockResult(null);
    try {
      const res = await api.runDeadlock(deadlockMode);
      setDeadlockResult(res);
    } catch (err: any) {
      alert(`Deadlock simulation failed: ${err.message}`);
    } finally {
      setDeadlockLoading(false);
    }
  };

  // Sync Mutex runner
  const handleRunSync = async () => {
    setSyncLoading(true);
    setSyncResult(null);
    try {
      const res = await api.runSync(syncThreads, syncIncrements, useMutex);
      setSyncResult(res);
    } catch (err: any) {
      alert(`Sync test failed: ${err.message}`);
    } finally {
      setSyncLoading(false);
    }
  };

  return (
    <div className="lab-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Banner */}
      <div className="card glass-panel" style={{ 
        padding: '1.8rem', 
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(168, 85, 247, 0.08) 100%)',
        border: '1px solid rgba(99, 102, 241, 0.3)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.2rem 0.6rem', borderRadius: '20px', background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              <Terminal size={14} /> Academic Evaluation Center
            </div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>
              Operating Systems & DBMS Concept Verification Lab
            </h1>
            <p style={{ color: 'var(--text-muted)', margin: '0.4rem 0 0', maxWidth: '800px', fontSize: '0.95rem' }}>
              Live interactive demonstrations verifying core curriculum concepts against actual PostgreSQL 18 ACID database transactions and Python OS concurrency primitives.
            </p>
          </div>
        </div>
      </div>

      {/* Module Selector Navigation */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.8rem' }}>
        <button
          onClick={() => setActiveModule('concurrency')}
          className={`card ${activeModule === 'concurrency' ? 'glass-panel active-tab' : 'glass-panel'}`}
          style={{
            padding: '1rem',
            textAlign: 'left',
            cursor: 'pointer',
            border: activeModule === 'concurrency' ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
            background: activeModule === 'concurrency' ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-card)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#818cf8', fontWeight: 700 }}>
            <Database size={20} /> PostgreSQL GiST Exclusion
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
            20-50 simultaneous thread race condition against PostgreSQL 18
          </div>
        </button>

        <button
          onClick={() => setActiveModule('fcfs')}
          className={`card ${activeModule === 'fcfs' ? 'glass-panel active-tab' : 'glass-panel'}`}
          style={{
            padding: '1rem',
            textAlign: 'left',
            cursor: 'pointer',
            border: activeModule === 'fcfs' ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
            background: activeModule === 'fcfs' ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-card)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#34d399', fontWeight: 700 }}>
            <Cpu size={20} /> FCFS Process Scheduling
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
            Interactive Gantt chart, Turnaround Time & Waiting Time analysis
          </div>
        </button>

        <button
          onClick={() => setActiveModule('deadlock')}
          className={`card ${activeModule === 'deadlock' ? 'glass-panel active-tab' : 'glass-panel'}`}
          style={{
            padding: '1rem',
            textAlign: 'left',
            cursor: 'pointer',
            border: activeModule === 'deadlock' ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
            background: activeModule === 'deadlock' ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-card)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#f43f5e', fontWeight: 700 }}>
            <ShieldAlert size={20} /> Deadlock & Resource Hierarchy
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
            Coffman circular wait condition vs strict lock ordering
          </div>
        </button>

        <button
          onClick={() => setActiveModule('sync')}
          className={`card ${activeModule === 'sync' ? 'glass-panel active-tab' : 'glass-panel'}`}
          style={{
            padding: '1rem',
            textAlign: 'left',
            cursor: 'pointer',
            border: activeModule === 'sync' ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
            background: activeModule === 'sync' ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-card)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#fbbf24', fontWeight: 700 }}>
            <Lock size={20} /> Critical Section & Mutex
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
            Race condition demonstration vs atomic Mutex synchronization
          </div>
        </button>
      </div>

      {/* MODULE 1: CONCURRENCY RACE & POSTGRESQL EXCLUSION */}
      {activeModule === 'concurrency' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div className="card glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Database color="#6366f1" size={22} /> Live High-Concurrency ACID Double-Booking Race
                </h3>
                <p style={{ margin: '0.4rem 0 0', color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '750px' }}>
                  Spawns concurrent worker threads in parallel, each firing an independent PostgreSQL transaction targeting the <strong>exact same venue and time window</strong> simultaneously. 
                  Demonstrates how PostgreSQL 18's <code>EXCLUDE USING gist</code> and row locks guarantee that exactly 1 booking succeeds while all others are rejected without race conditions.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '0.8rem 1.2rem', borderRadius: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Concurrent Threads</label>
                  <input 
                    type="number" 
                    min={5} 
                    max={50} 
                    value={numThreads}
                    onChange={e => setNumThreads(Number(e.target.value))}
                    style={{ width: '70px', padding: '0.3rem 0.5rem', borderRadius: '6px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: '#fff', fontWeight: 700 }}
                  />
                </div>
                <button 
                  onClick={handleRunRace} 
                  className="btn btn-primary"
                  disabled={raceLoading}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem' }}
                >
                  <Play size={16} className={raceLoading ? 'spin' : ''} />
                  {raceLoading ? 'Executing Race...' : `Launch ${numThreads} Threads`}
                </button>
              </div>
            </div>

            {/* Explanation card */}
            <div style={{ marginTop: '1.2rem', padding: '1rem', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', fontSize: '0.85rem' }}>
              <div>
                <strong style={{ color: '#818cf8' }}>1. The Traditional Web Bug:</strong>
                <p style={{ margin: '0.3rem 0 0', color: 'var(--text-muted)' }}>
                  A standard <code>SELECT ... WHERE NOT EXISTS</code> followed by <code>INSERT</code> suffers from Time-of-Check to Time-of-Use (TOCTOU). Multiple requests see the slot free at the same millisecond and both insert, causing disastrous double bookings.
                </p>
              </div>
              <div>
                <strong style={{ color: '#34d399' }}>2. The Database-Level Solution:</strong>
                <p style={{ margin: '0.3rem 0 0', color: 'var(--text-muted)' }}>
                  PostgreSQL 18 btree_gist exclusion index enforces <code>(venue_id WITH =, during WITH &&)</code> at the storage engine level. Even if 100 threads fire in the same microsecond, the kernel serializes writes and raises <code>23P01 exclusion_violation</code>.
                </p>
              </div>
            </div>
          </div>

          {/* Results Display */}
          {raceResult && (
            <div className="card glass-panel" style={{ padding: '1.5rem', border: '1px solid #10b981' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981' }}>
                    <CheckCircle2 size={20} /> Race Completed: ACID Guarantee Verified
                  </h4>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    Venue: <strong>{raceResult.venue_code || '106'}</strong> | Slot: <strong>{raceResult.slot_time || '10:00 - 11:00'}</strong>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1.5rem' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981' }}>{raceResult.successful_count}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Booked (Success)</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f43f5e' }}>{raceResult.rejected_count}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Conflict Rejected</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#818cf8' }}>{raceResult.total_threads}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Contenders</div>
                  </div>
                </div>
              </div>

              {/* Thread-by-thread Execution Log */}
              <h5 style={{ margin: '0 0 0.8rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Simultaneous Thread Trajectory (PostgreSQL 18 Kernel Dispatch)</h5>
              <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                {raceResult.results?.map((t: any, i: number) => (
                  <div 
                    key={i} 
                    style={{ 
                      padding: '0.4rem 0.8rem', 
                      borderRadius: '6px', 
                      background: t.status === 'SUCCESS' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.08)',
                      border: t.status === 'SUCCESS' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(244, 63, 94, 0.2)',
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center' 
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      {t.status === 'SUCCESS' ? <CheckCircle2 size={16} color="#10b981" /> : <XCircle size={16} color="#f43f5e" />}
                      <span style={{ fontWeight: 700 }}>Thread #{t.thread_id}</span>
                      <span style={{ color: 'var(--text-muted)' }}>({t.status === 'SUCCESS' ? 'Transaction Committed' : 'Rolled Back: 23P01 Conflict'})</span>
                    </div>
                    <div style={{ color: t.status === 'SUCCESS' ? '#10b981' : '#f43f5e', fontWeight: 600 }}>
                      {t.status === 'SUCCESS' ? '200 OK (Confirmed)' : '409 Conflict (Protected)'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODULE 2: FCFS PROCESS SCHEDULING */}
      {activeModule === 'fcfs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div className="card glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Cpu color="#34d399" size={22} /> FCFS (First-Come, First-Served) Scheduling Engine
                </h3>
                <p style={{ margin: '0.4rem 0 0', color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '750px' }}>
                  Simulates non-preemptive FCFS scheduling applied to campus resource allocation queue. Evaluates Waiting Time (WT), Turnaround Time (TAT), and Gantt timeline rendering.
                </p>
              </div>

              <button 
                onClick={handleRunFcfs} 
                className="btn btn-primary"
                disabled={fcfsLoading}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem' }}
              >
                <Play size={16} className={fcfsLoading ? 'spin' : ''} />
                {fcfsLoading ? 'Simulating...' : 'Calculate FCFS Schedule'}
              </button>
            </div>

            {/* Editable Job Queue */}
            <div style={{ marginTop: '1.2rem' }}>
              <h5 style={{ margin: '0 0 0.8rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Process / Request Input Queue</h5>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '0.6rem 0.8rem' }}>Process Label</th>
                      <th style={{ padding: '0.6rem 0.8rem' }}>Arrival Time (t)</th>
                      <th style={{ padding: '0.6rem 0.8rem' }}>Burst Time (Units)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fcfsJobs.map((j, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.6rem 0.8rem', fontWeight: 600 }}>{j.id}</td>
                        <td style={{ padding: '0.6rem 0.8rem' }}>
                          <input 
                            type="number" 
                            min={0}
                            value={j.arrival_time}
                            onChange={e => {
                              const updated = [...fcfsJobs];
                              updated[idx].arrival_time = Number(e.target.value);
                              setFcfsJobs(updated);
                            }}
                            style={{ width: '60px', padding: '0.2rem 0.4rem', borderRadius: '4px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: '#fff' }}
                          />
                        </td>
                        <td style={{ padding: '0.6rem 0.8rem' }}>
                          <input 
                            type="number" 
                            min={1}
                            value={j.burst_time}
                            onChange={e => {
                              const updated = [...fcfsJobs];
                              updated[idx].burst_time = Number(e.target.value);
                              setFcfsJobs(updated);
                            }}
                            style={{ width: '60px', padding: '0.2rem 0.4rem', borderRadius: '4px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: '#fff' }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* FCFS Output & Gantt Chart */}
          {fcfsResult && (
            <div className="card glass-panel" style={{ padding: '1.5rem', border: '1px solid #34d399' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.2rem' }}>
                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#34d399' }}>
                  <BarChart2 size={20} /> FCFS Execution Metrics
                </h4>
                <div style={{ display: 'flex', gap: '1.5rem' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fbbf24' }}>{fcfsResult.avg_waiting_time?.toFixed(2)}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Avg Waiting Time (WT)</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#38bdf8' }}>{fcfsResult.avg_turnaround_time?.toFixed(2)}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Avg Turnaround Time (TAT)</div>
                  </div>
                </div>
              </div>

              {/* Gantt Chart Bar */}
              <h5 style={{ margin: '0 0 0.8rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Interactive OS Gantt Chart Timeline</h5>
              <div style={{ display: 'flex', width: '100%', borderRadius: '8px', overflow: 'hidden', height: '48px', border: '1px solid var(--border-color)', marginBottom: '0.5rem' }}>
                {fcfsResult.schedule?.map((item: any, i: number) => {
                  const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
                  const color = colors[i % colors.length];
                  const widthPercent = (item.burst_time / (fcfsResult.total_time || 1)) * 100;
                  return (
                    <div 
                      key={i} 
                      style={{ 
                        width: `${widthPercent}%`, 
                        background: color, 
                        color: '#fff', 
                        display: 'flex', 
                        flexDirection: 'column',
                        alignItems: 'center', 
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        borderRight: '1px solid rgba(0,0,0,0.3)',
                        padding: '0 4px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                      title={`${item.id}: Start ${item.start_time}, End ${item.completion_time}`}
                    >
                      <span>{item.id.split(' ')[0]}</span>
                      <span style={{ fontSize: '0.65rem', opacity: 0.85 }}>[{item.start_time} - {item.completion_time}]</span>
                    </div>
                  );
                })}
              </div>

              {/* Metrics Table */}
              <div style={{ overflowX: 'auto', marginTop: '1.2rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '0.6rem 0.8rem' }}>Process</th>
                      <th style={{ padding: '0.6rem 0.8rem' }}>Arrival</th>
                      <th style={{ padding: '0.6rem 0.8rem' }}>Burst</th>
                      <th style={{ padding: '0.6rem 0.8rem' }}>Start</th>
                      <th style={{ padding: '0.6rem 0.8rem' }}>Completion</th>
                      <th style={{ padding: '0.6rem 0.8rem' }}>Waiting Time (WT)</th>
                      <th style={{ padding: '0.6rem 0.8rem' }}>Turnaround (TAT)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fcfsResult.schedule?.map((item: any, i: number) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.6rem 0.8rem', fontWeight: 600 }}>{item.id}</td>
                        <td style={{ padding: '0.6rem 0.8rem' }}>{item.arrival_time}</td>
                        <td style={{ padding: '0.6rem 0.8rem' }}>{item.burst_time}</td>
                        <td style={{ padding: '0.6rem 0.8rem' }}>{item.start_time}</td>
                        <td style={{ padding: '0.6rem 0.8rem' }}>{item.completion_time}</td>
                        <td style={{ padding: '0.6rem 0.8rem', color: '#fbbf24', fontWeight: 700 }}>{item.waiting_time}</td>
                        <td style={{ padding: '0.6rem 0.8rem', color: '#38bdf8', fontWeight: 700 }}>{item.turnaround_time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODULE 3: DEADLOCK & COFFMAN CONDITIONS */}
      {activeModule === 'deadlock' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div className="card glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldAlert color="#f43f5e" size={22} /> Deadlock Simulation & Prevention via Lock Hierarchy
                </h3>
                <p style={{ margin: '0.4rem 0 0', color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '750px' }}>
                  Demonstrates the 4 Coffman conditions for deadlock (Mutual Exclusion, Hold and Wait, No Preemption, Circular Wait) and demonstrates how total resource ordering breaks circular wait.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.3rem', background: 'rgba(0,0,0,0.3)', padding: '0.3rem', borderRadius: '8px' }}>
                  <button 
                    onClick={() => setDeadlockMode('deadlock')}
                    className={`btn ${deadlockMode === 'deadlock' ? 'btn-danger' : 'btn-outline'}`}
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                  >
                    Simulate Deadlock
                  </button>
                  <button 
                    onClick={() => setDeadlockMode('prevent')}
                    className={`btn ${deadlockMode === 'prevent' ? 'btn-success' : 'btn-outline'}`}
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                  >
                    Apply Lock Ordering
                  </button>
                </div>
                <button 
                  onClick={handleRunDeadlock} 
                  className="btn btn-primary"
                  disabled={deadlockLoading}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}
                >
                  <Play size={16} className={deadlockLoading ? 'spin' : ''} />
                  {deadlockLoading ? 'Executing...' : 'Run Simulation'}
                </button>
              </div>
            </div>

            {/* Coffman Conditions Reference */}
            <div style={{ marginTop: '1.2rem', padding: '1rem', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.8rem', fontSize: '0.8rem' }}>
              <div>
                <strong>1. Mutual Exclusion:</strong>
                <p style={{ margin: '0.2rem 0 0', color: 'var(--text-muted)' }}>Resource cannot be shared concurrently.</p>
              </div>
              <div>
                <strong>2. Hold & Wait:</strong>
                <p style={{ margin: '0.2rem 0 0', color: 'var(--text-muted)' }}>Process holds resource A while requesting B.</p>
              </div>
              <div>
                <strong>3. No Preemption:</strong>
                <p style={{ margin: '0.2rem 0 0', color: 'var(--text-muted)' }}>Resources cannot be forcibly seized.</p>
              </div>
              <div>
                <strong style={{ color: deadlockMode === 'prevent' ? '#10b981' : '#f43f5e' }}>
                  4. Circular Wait: {deadlockMode === 'prevent' ? 'ELIMINATED' : 'ACTIVE'}
                </strong>
                <p style={{ margin: '0.2rem 0 0', color: 'var(--text-muted)' }}>
                  {deadlockMode === 'prevent' 
                    ? 'Total lock order (R1 < R2) mathematically eliminates circular wait cycles.'
                    : 'Thread 1 (holds A, wants B) ⟷ Thread 2 (holds B, wants A).'}
                </p>
              </div>
            </div>
          </div>

          {/* Deadlock Output */}
          {deadlockResult && (
            <div className="card glass-panel" style={{ padding: '1.5rem', border: deadlockResult.deadlock_detected ? '1px solid #f43f5e' : '1px solid #10b981' }}>
              <h4 style={{ margin: '0 0 1rem', fontSize: '1.1rem', fontWeight: 700, color: deadlockResult.deadlock_detected ? '#f43f5e' : '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {deadlockResult.deadlock_detected ? <ShieldAlert size={20} /> : <CheckCircle2 size={20} />}
                {deadlockResult.message || (deadlockResult.deadlock_detected ? 'Circular Wait Deadlock Occurred!' : 'Execution Completed Successfully Without Deadlock')}
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <strong style={{ fontSize: '0.85rem', color: '#818cf8', display: 'block', marginBottom: '0.5rem' }}>Thread 1 Execution Trace:</strong>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    {deadlockResult.thread1_trace?.map((line: string, i: number) => (
                      <div key={i}>• {line}</div>
                    ))}
                  </div>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <strong style={{ fontSize: '0.85rem', color: '#f472b6', display: 'block', marginBottom: '0.5rem' }}>Thread 2 Execution Trace:</strong>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    {deadlockResult.thread2_trace?.map((line: string, i: number) => (
                      <div key={i}>• {line}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODULE 4: MUTEX & RACE CONDITION */}
      {activeModule === 'sync' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div className="card glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Lock color="#fbbf24" size={22} /> Critical Section Race Condition vs Mutex Synchronization
                </h3>
                <p style={{ margin: '0.4rem 0 0', color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '750px' }}>
                  Runs multiple worker threads concurrently executing thousands of increments on a shared counter. 
                  Observe lost updates when synchronization is disabled versus exact correctness when protected by a Mutual Exclusion Lock (Mutex).
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '0.8rem 1.2rem', borderRadius: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>
                  <input 
                    type="checkbox" 
                    checked={useMutex}
                    onChange={e => setUseMutex(e.target.checked)}
                  />
                  <span>Enable Mutex Protection</span>
                </label>
                <button 
                  onClick={handleRunSync} 
                  className="btn btn-primary"
                  disabled={syncLoading}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}
                >
                  <Play size={16} className={syncLoading ? 'spin' : ''} />
                  {syncLoading ? 'Running...' : 'Run Test'}
                </button>
              </div>
            </div>

            {/* Controls */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1.2rem' }}>
              <div className="form-group">
                <label className="form-label">Threads: {syncThreads}</label>
                <input 
                  type="range" 
                  min={2} 
                  max={20} 
                  value={syncThreads}
                  onChange={e => setSyncThreads(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Increments Per Thread: {syncIncrements}</label>
                <input 
                  type="range" 
                  min={1000} 
                  max={20000} 
                  step={1000}
                  value={syncIncrements}
                  onChange={e => setSyncIncrements(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Theoretical Expected Value</label>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#818cf8', paddingTop: '0.3rem' }}>
                  {(syncThreads * syncIncrements).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Sync Result */}
          {syncResult && (
            <div className="card glass-panel" style={{ padding: '1.5rem', border: syncResult.race_detected ? '1px solid #f43f5e' : '1px solid #10b981' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: syncResult.race_detected ? '#f43f5e' : '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {syncResult.race_detected ? <AlertCircleIcon /> : <CheckCircle2 size={20} />}
                    {syncResult.race_detected ? 'Race Condition Detected! (Data Corruption / Lost Updates)' : 'Atomic Synchronization Preserved!'}
                  </h4>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    {syncResult.use_mutex ? 'Mutex Lock Acquired & Released per Critical Section' : 'Unsynchronized Shared Variable Access'}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1.5rem' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#818cf8' }}>{syncResult.expected_value?.toLocaleString()}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Expected Value</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: syncResult.race_detected ? '#f43f5e' : '#10b981' }}>
                      {syncResult.final_value?.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Actual Value</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: syncResult.lost_updates > 0 ? '#f43f5e' : '#10b981' }}>
                      {syncResult.lost_updates?.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Lost Updates</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

function AlertCircleIcon() {
  return <ShieldAlert size={20} />;
}
