import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Inbox, CheckCircle, XCircle, Clock, MapPin, Users, AlertCircle, ShieldAlert, FileText, Check } from 'lucide-react';

interface AllocationInboxProps {
  currentUser: any;
}

export const AllocationInbox: React.FC<AllocationInboxProps> = ({ currentUser }) => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Reject modal state
  const [rejectModalReq, setRejectModalReq] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadInbox();
  }, []);

  const loadInbox = async () => {
    setLoading(true);
    try {
      const data = await api.getAllocationInbox();
      setRequests(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (reqId: string) => {
    setProcessingId(reqId);
    setMessage(null);
    try {
      const idempotencyKey = `appr-${Date.now()}-${reqId.substring(0, 6)}`;
      const res = await api.approveRequest(reqId, 'Approved by Allocation Faculty', idempotencyKey);
      setMessage({
        type: 'success',
        text: `Booking approved successfully! Booking ID: ${res.id.substring(0, 8)}... Room occupancy secured in PostgreSQL.`
      });
      loadInbox();
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message || 'Approval failed'
      });
      loadInbox(); // reload to show conflict status
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a mandatory reason for rejection.');
      return;
    }
    setProcessingId(rejectModalReq.id);
    try {
      await api.rejectRequest(rejectModalReq.id, rejectionReason);
      setRejectModalReq(null);
      setRejectionReason('');
      setMessage({
        type: 'success',
        text: 'Request rejected and notification dispatched to applicant.'
      });
      loadInbox();
    } catch (err: any) {
      alert(`Rejection failed: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Title */}
      <div>
        <h2 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Inbox size={26} color="#FBBF24" /> Module C: Allocation Faculty Inbox
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '0.25rem' }}>
          Decide space allocation requests for your explicitly assigned rooms or buildings. Approval executes an atomic ACID transaction with row locks and <code style={{ fontFamily: 'var(--font-mono)', color: '#818CF8' }}>btree_gist</code> exclusion checks.
        </p>
      </div>

      {/* Scope Disclaimer Banner */}
      <div style={{ padding: '0.85rem 1.25rem', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <ShieldAlert size={20} color="#FBBF24" style={{ flexShrink: 0 }} />
        <div style={{ fontSize: '0.85rem', color: '#FDE68A' }}>
          <strong>Scoped Authority:</strong> You can only review and decide requests for spaces within your designated allocation scope. Self-approval is strictly prohibited by database guardrails.
        </div>
      </div>

      {/* Action Messages */}
      {message && (
        <div style={{ padding: '1rem', borderRadius: 'var(--radius-sm)', background: message.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)', border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)'}`, color: message.type === 'success' ? '#34D399' : '#F87171', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <div>{message.text}</div>
        </div>
      )}

      {/* Pending Requests List */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.2rem' }}>Pending Requests Requiring Decision ({requests.length})</h3>
          <button className="btn btn-secondary btn-sm" onClick={loadInbox}>Refresh Inbox</button>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading allocation inbox...</div>
        ) : requests.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Your inbox is completely clear! No pending requests for your assigned venues.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {requests.map((r) => {
              const isSelfRequest = currentUser?.id === r.requested_by_user_id;

              return (
                <div
                  key={r.id}
                  style={{
                    padding: '1.4rem',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1.25rem'
                  }}
                >
                  <div style={{ maxWidth: '650px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '1.15rem', color: '#A5B4FC' }}>
                        {r.venue_name}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>({r.building})</span>
                      <span className="status-pill PENDING">PENDING APPROVAL</span>
                    </div>

                    <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                      {r.purpose}
                    </div>

                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', flexWrap: 'wrap', gap: '0.8rem', marginBottom: '0.5rem' }}>
                      <span><strong>Requester:</strong> {r.requester_name} ({r.requester_role})</span>
                      <span><strong>Group:</strong> {r.participant_group || 'N/A'}</span>
                      <span><strong>Attendance:</strong> {r.expected_attendance}</span>
                    </div>

                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      <Clock size={13} style={{ display: 'inline', marginRight: '0.25rem' }} />
                      <strong>Date & Time:</strong> {r.booking_date} ({r.start_time} - {r.end_time})
                    </div>

                    {r.required_equipment && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                        <strong>Requested Equipment:</strong> {r.required_equipment}
                      </div>
                    )}

                    {r.conflict_message && (
                      <div style={{ marginTop: '0.6rem', padding: '0.4rem 0.75rem', background: 'rgba(244, 63, 94, 0.1)', color: '#F87171', borderRadius: '4px', fontSize: '0.8rem' }}>
                        <strong>Clash Detected:</strong> {r.conflict_message}
                      </div>
                    )}

                    {isSelfRequest && (
                      <div style={{ marginTop: '0.6rem', padding: '0.4rem 0.75rem', background: 'rgba(245, 158, 11, 0.1)', color: '#FBBF24', borderRadius: '4px', fontSize: '0.8rem' }}>
                        Notice: You submitted this request. Self-approval rule prevents you from deciding your own application.
                      </div>
                    )}
                  </div>

                  {/* Decision Actions */}
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ color: '#F87171', borderColor: 'rgba(244, 63, 94, 0.3)' }}
                      onClick={() => { setRejectModalReq(r); setRejectionReason(''); }}
                      disabled={processingId === r.id || isSelfRequest}
                    >
                      <XCircle size={15} /> Reject
                    </button>

                    <button
                      className="btn btn-success btn-sm"
                      onClick={() => handleApprove(r.id)}
                      disabled={processingId === r.id || isSelfRequest}
                    >
                      <Check size={15} /> {processingId === r.id ? 'Securing...' : 'Approve & Confirm'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rejection Modal */}
      {rejectModalReq && (
        <div className="modal-backdrop" onClick={() => setRejectModalReq(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem', color: '#F87171' }}>
              Reject Booking Request
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Section 1 & 3: Rejection requires an explicit reason which is durably stored in the request history and sent to the applicant.
            </p>

            <div style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Reason for Rejection</label>
              <textarea
                className="input-control"
                rows={3}
                placeholder="e.g. Space reserved for departmental conference rehearsals, please pick an alternative date..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn btn-secondary" onClick={() => setRejectModalReq(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleReject}>Confirm Rejection</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
