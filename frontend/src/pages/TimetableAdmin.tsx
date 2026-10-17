import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Layers, UploadCloud, Eye, AlertTriangle, CheckCircle, FileText, ArrowRight, ShieldCheck, RefreshCw, Cpu } from 'lucide-react';

export const TimetableAdmin: React.FC = () => {
  const [versions, setVersions] = useState<any[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<any>(null);
  const [entriesData, setEntriesData] = useState<any>(null);
  const [conflictsData, setConflictsData] = useState<any>(null);

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [activeJob, setActiveJob] = useState<any>(null);

  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const vList = await api.listTimetableVersions();
      setVersions(vList);
      if (vList.length > 0 && !selectedVersion) {
        selectVersion(vList[0]);
      }
      const logs = await api.listAuditLogs();
      setAuditLogs(logs);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const selectVersion = async (v: any) => {
    setSelectedVersion(v);
    setConflictsData(null);
    try {
      const ent = await api.getVersionEntries(v.id, 0, 50);
      setEntriesData(ent);
      const conf = await api.previewConflicts(v.id);
      setConflictsData(conf);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setUploading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append('file', uploadFile);

    try {
      const res = await api.uploadTimetable(formData);
      setActiveJob({ id: res.job_id, filename: res.filename, status: 'QUEUED', progress_pct: 0 });
      setMessage({
        type: 'success',
        text: `File uploaded securely (SHA-256: ${res.sha256_digest.substring(0, 12)}...). Producer created durable job in PostgreSQL.`
      });

      // Poll worker progress
      pollJobProgress(res.job_id);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Upload failed' });
    } finally {
      setUploading(false);
    }
  };

  const pollJobProgress = (jobId: string) => {
    const interval = setInterval(async () => {
      try {
        const job = await api.getImportJobStatus(jobId);
        setActiveJob(job);
        if (job.status === 'COMPLETED' || job.status === 'FAILED') {
          clearInterval(interval);
          loadData();
        }
      } catch {
        clearInterval(interval);
      }
    }, 1500);
  };

  const handlePublish = async (versionId: string) => {
    if (!confirm('Atomically activate this timetable version? This will switch active schedule and bump global schedule_rev under advisory lock.')) return;
    try {
      await api.publishVersion(versionId);
      setMessage({
        type: 'success',
        text: 'Timetable published and activated successfully!'
      });
      loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Publication blocked' });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Title */}
      <div>
        <h2 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Layers size={26} color="#818CF8" /> Module D: Administration & Timetable Management
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '0.25rem' }}>
          Upload PDF timetables, monitor background worker extraction, review draft cells against source coordinates, and atomically publish schedules under exclusive advisory locks.
        </p>
      </div>

      {message && (
        <div style={{ padding: '1rem', borderRadius: 'var(--radius-sm)', background: message.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)', border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)'}`, color: message.type === 'success' ? '#34D399' : '#F87171' }}>
          {message.text}
        </div>
      )}

      {/* Grid: Upload & Worker Status + Version Selector */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
        {/* PDF Upload Card */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <UploadCloud size={20} color="#818CF8" /> Import Timetable (PDF / JSON)
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Section 5: Native text & geometry parsing with pdfplumber. Uploads remain draft until verified and published.
          </p>

          <form onSubmit={handleFileUpload} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input
              type="file"
              accept=".pdf,.json,.xlsx"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              className="input-control"
              style={{ padding: '0.5rem' }}
              required
            />

            <button type="submit" className="btn btn-primary" disabled={uploading || !uploadFile}>
              {uploading ? 'Uploading to Producer...' : 'Upload & Queue Job'}
            </button>
          </form>

          {/* Background Worker Job Monitor */}
          {activeJob && (
            <div style={{ marginTop: '1.25rem', padding: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', fontSize: '0.82rem' }}>
                <span><strong>Worker Job:</strong> {activeJob.filename}</span>
                <span className="status-pill PENDING">{activeJob.status}</span>
              </div>

              {/* Progress Bar */}
              <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden', margin: '0.5rem 0' }}>
                <div style={{ width: `${activeJob.progress_pct || 10}%`, height: '100%', background: 'linear-gradient(90deg, #6366F1, #34D399)', transition: 'width 0.4s ease' }} />
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {activeJob.progress_pct}% completed • Consumer processing PDF geometry
              </div>
            </div>
          )}
        </div>

        {/* Timetable Versions List */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={20} color="#818CF8" /> Timetable Versions ({versions.length})
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '280px', overflowY: 'auto' }}>
            {versions.map((v) => (
              <div
                key={v.id}
                onClick={() => selectVersion(v)}
                style={{
                  padding: '0.85rem',
                  background: selectedVersion?.id === v.id ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                  border: `1px solid ${selectedVersion?.id === v.id ? 'var(--primary)' : 'var(--border-color)'}`,
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{v.name}</div>
                  <span className={`status-pill ${v.status === 'PUBLISHED' ? 'AVAILABLE' : 'PENDING'}`}>
                    {v.status}
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {v.entry_count} sessions • Effective from: {v.effective_from}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Selected Version Detail & Pre-publication Gates */}
      {selectedVersion && (
        <div className="glass-card" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <h3 style={{ fontSize: '1.35rem' }}>{selectedVersion.name}</h3>
                <span className={`status-pill ${selectedVersion.is_active ? 'AVAILABLE' : 'PENDING'}`}>
                  {selectedVersion.is_active ? 'ACTIVE VERSION' : 'DRAFT VERSION'}
                </span>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                File: {selectedVersion.source_filename || 'B.Tech-C.S.E-V-TT-2-2.pdf'} • Total Classes: {selectedVersion.entry_count}
              </div>
            </div>

            {/* Publication Gate Button */}
            {!selectedVersion.is_active && (
              <button
                className="btn btn-primary"
                onClick={() => handlePublish(selectedVersion.id)}
                disabled={conflictsData && !conflictsData.can_publish}
              >
                <ShieldCheck size={18} /> Atomically Publish Timetable
              </button>
            )}
          </div>

          {/* Conflict Inspection Alert (Section 9 & 11) */}
          {conflictsData && (
            <div style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem', borderRadius: 'var(--radius-sm)', background: conflictsData.can_publish ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.12)', border: `1px solid ${conflictsData.can_publish ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}` }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: conflictsData.can_publish ? '#34D399' : '#F87171', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                {conflictsData.can_publish ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                Pre-publication Conflict Check: {conflictsData.can_publish ? 'Clean (0 Clashes)' : `${conflictsData.total_conflicts} Collisions with Confirmed Bookings!`}
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                {conflictsData.can_publish
                  ? 'No collisions detected against confirmed reservations. This schedule can be published safely.'
                  : 'Default policy: Revised timetables cannot silently overwrite confirmed reservations. Reschedule or cancel colliding bookings before publication.'}
              </p>
            </div>
          )}

          {/* Extracted Timetable Sessions Table with Source Evidence */}
          <h4 style={{ fontSize: '1.05rem', marginBottom: '0.75rem' }}>
            Extracted Class Sessions & Original Source Cell Evidence
          </h4>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.04)', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '0.75rem' }}>Section</th>
                  <th style={{ padding: '0.75rem' }}>Subject</th>
                  <th style={{ padding: '0.75rem' }}>Faculty</th>
                  <th style={{ padding: '0.75rem' }}>Venue</th>
                  <th style={{ padding: '0.75rem' }}>Day</th>
                  <th style={{ padding: '0.75rem' }}>Time Interval</th>
                  <th style={{ padding: '0.75rem' }}>Type</th>
                  <th style={{ padding: '0.75rem' }}>Source Provenance</th>
                </tr>
              </thead>
              <tbody>
                {entriesData?.entries?.map((e: any) => (
                  <tr key={e.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 600 }}>{e.section}</td>
                    <td style={{ padding: '0.75rem' }}>{e.subject_code}</td>
                    <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>{e.faculty_name}</td>
                    <td style={{ padding: '0.75rem', color: '#A5B4FC', fontWeight: 600 }}>{e.venue_name}</td>
                    <td style={{ padding: '0.75rem' }}>Day {e.day_of_week}</td>
                    <td style={{ padding: '0.75rem', fontFamily: 'var(--font-mono)' }}>{e.start_time} - {e.end_time}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{ fontSize: '0.72rem', padding: '0.15rem 0.45rem', borderRadius: '4px', background: e.entry_type === 'LAB' ? 'rgba(244, 63, 94, 0.15)' : 'rgba(99, 102, 241, 0.15)', color: e.entry_type === 'LAB' ? '#F43F5E' : '#818CF8' }}>
                        {e.entry_type}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                      {e.source_ref}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Audit Logs Table */}
      <div className="glass-card" style={{ padding: '1.75rem' }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileText size={20} color="#818CF8" /> Immutable Audit Trail ({auditLogs.length} Records)
        </h3>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Section 8: Every booking approval, cancellation, and timetable publication commits an audit log entry in the primary transaction.
        </p>

        <div style={{ overflowX: 'auto', maxHeight: '300px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.04)', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '0.6rem' }}>Timestamp</th>
                <th style={{ padding: '0.6rem' }}>Action</th>
                <th style={{ padding: '0.6rem' }}>Entity</th>
                <th style={{ padding: '0.6rem' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                  <td style={{ padding: '0.6rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td style={{ padding: '0.6rem', fontWeight: 600, color: '#A5B4FC' }}>{log.action}</td>
                  <td style={{ padding: '0.6rem' }}>{log.entity_type} ({log.entity_id?.substring(0, 8)}...)</td>
                  <td style={{ padding: '0.6rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                    {JSON.stringify(log.details)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
