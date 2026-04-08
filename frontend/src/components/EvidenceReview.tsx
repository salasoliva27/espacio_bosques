/**
 * EvidenceReview — shows all EVIDENCE_REVIEW milestones for a project.
 * Community members vote APPROVE/REJECT; owner can override if < 5 investors.
 */
import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, FileText, ShieldCheck, ShieldAlert, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/auth';

interface CostItem { id: string; description: string; amountMxn: number; category: string }
interface AiAnalysis { valid: boolean; docType: string; extractedAmountMxn?: number; matchScore: number; matchesCostItems: boolean; notes: string }
interface Doc { id: string; filename: string; mimeType: string; sizeBytes: number; validated: boolean; aiAnalysis?: AiAnalysis }
interface Vote { id: string; voterId: string; voterName: string; vote: 'APPROVE' | 'REJECT'; reason?: string; createdAt: string }
interface CompletionReq {
  id: string; milestoneId: string; milestoneTitle: string;
  submitterName: string; totalCostMxn: number;
  status: 'PENDING_VOTES' | 'OWNER_REVIEW' | 'APPROVED' | 'REJECTED';
  submittedAt: string; resolvedAt?: string; resolutionNote?: string;
  votes: Vote[]; approveCount: number; rejectCount: number; totalVotes: number;
  docs: Doc[]; costs: CostItem[]; eligibleVoters: number; threshold: number | null;
}

function fmt(n: number) { return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }); }

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  PENDING_VOTES: { label: 'Voting open', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  OWNER_REVIEW:  { label: 'Owner review', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  APPROVED:      { label: 'Approved ✓', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  REJECTED:      { label: 'Rejected', color: '#f87171', bg: 'rgba(239,68,68,0.12)' },
};

interface Props {
  projectId: string;
  isOwner: boolean;
  currentUserId: string | null;
  onResolved?: () => void;
}

export default function EvidenceReview({ projectId, isOwner, currentUserId, onResolved }: Props) {
  const [requests, setRequests] = useState<CompletionReq[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [voting, setVoting] = useState<Record<string, boolean>>({});
  const [voteReasons, setVoteReasons] = useState<Record<string, string>>({});
  const [error, setError] = useState<Record<string, string>>({});

  useEffect(() => { load(); }, [projectId]);

  async function load() {
    const r = await fetch(`/api/moneyflow/${projectId}/completion-requests`);
    if (r.ok) { const d = await r.json(); setRequests(d.requests ?? []); }
  }

  async function getToken() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }

  async function castVote(reqId: string, vote: 'APPROVE' | 'REJECT') {
    const token = await getToken();
    setVoting(v => ({ ...v, [reqId]: true }));
    setError(e => ({ ...e, [reqId]: '' }));
    try {
      const res = await fetch(`/api/moneyflow/${projectId}/completion-requests/${reqId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ vote, reason: voteReasons[reqId] || undefined }),
      });
      const d = await res.json();
      if (!res.ok) { setError(e => ({ ...e, [reqId]: d.error ?? 'Vote failed' })); return; }
      await load();
      if (d.resolution?.status === 'APPROVED' || d.resolution?.status === 'REJECTED') onResolved?.();
    } catch { setError(e => ({ ...e, [reqId]: 'Network error' })); }
    finally { setVoting(v => ({ ...v, [reqId]: false })); }
  }

  async function ownerDecide(reqId: string, decision: 'APPROVE' | 'REJECT') {
    const token = await getToken();
    setVoting(v => ({ ...v, [reqId]: true }));
    try {
      const res = await fetch(`/api/moneyflow/${projectId}/completion-requests/${reqId}/owner-decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ decision, note: voteReasons[reqId] || undefined }),
      });
      const d = await res.json();
      if (!res.ok) { setError(e => ({ ...e, [reqId]: d.error ?? 'Decision failed' })); return; }
      await load();
      onResolved?.();
    } catch { setError(e => ({ ...e, [reqId]: 'Network error' })); }
    finally { setVoting(v => ({ ...v, [reqId]: false })); }
  }

  const active = requests.filter(r => r.status === 'PENDING_VOTES' || r.status === 'OWNER_REVIEW');
  const resolved = requests.filter(r => r.status === 'APPROVED' || r.status === 'REJECTED');

  if (requests.length === 0) return null;

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#0d1520', border: '1px solid #1e2d3d' }}>
      <div className="px-6 py-4" style={{ borderBottom: '1px solid #1e2d3d' }}>
        <h2 className="text-base font-semibold" style={{ color: '#e8f4f0' }}>Evidence Review</h2>
        <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
          Community votes on milestone completion evidence before funds are released
        </p>
      </div>

      <div className="p-6 space-y-4">
        {[...active, ...resolved].map(req => {
          const badge = STATUS_BADGE[req.status];
          const isOpen = expanded.has(req.id);
          const totalVoters = req.eligibleVoters;
          const threshold = req.threshold ?? 66.7;
          const approvePct = req.totalVotes > 0 ? (req.approveCount / req.totalVotes) * 100 : 0;
          const myVote = req.votes.find(v => v.voterId === currentUserId);
          const canVote = req.status === 'PENDING_VOTES' && !myVote && currentUserId;
          const canOwnerDecide = req.status === 'OWNER_REVIEW' && isOwner;
          const isPending = req.status === 'PENDING_VOTES' || req.status === 'OWNER_REVIEW';

          return (
            <div key={req.id} className="rounded-xl overflow-hidden" style={{ background: '#0a1420', border: `1px solid ${isPending ? 'rgba(59,130,246,0.25)' : '#1e2d3d'}` }}>
              {/* Header row */}
              <button
                className="w-full flex items-center justify-between px-4 py-3 text-left"
                onClick={() => setExpanded(s => { const n = new Set(s); n.has(req.id) ? n.delete(req.id) : n.add(req.id); return n; })}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: badge.bg, color: badge.color }}>{badge.label}</span>
                  <span className="text-sm font-medium truncate" style={{ color: '#e8f4f0' }}>{req.milestoneTitle}</span>
                  <span className="text-xs hidden sm:inline" style={{ color: '#6b7280' }}>by {req.submitterName}</span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-sm font-bold" style={{ color: '#f59e0b' }}>{fmt(req.totalCostMxn)}</span>
                  {isOpen ? <ChevronUp size={14} style={{ color: '#6b7280' }} /> : <ChevronDown size={14} style={{ color: '#6b7280' }} />}
                </div>
              </button>

              {isOpen && (
                <div className="px-4 pb-4 space-y-4" style={{ borderTop: '1px solid #1e2d3d' }}>

                  {/* Vote tally */}
                  {req.status !== 'REJECTED' && req.status !== 'APPROVED' && (
                    <div className="pt-3">
                      <div className="flex justify-between text-xs mb-1.5" style={{ color: '#9ca3af' }}>
                        <span>{req.approveCount} approve · {req.rejectCount} reject · {req.totalVotes} total votes</span>
                        <span>Need {threshold}% · {totalVoters} eligible</span>
                      </div>
                      <div className="relative w-full h-2.5 rounded-full overflow-hidden" style={{ background: '#1e2d3d' }}>
                        <div className="absolute h-full rounded-full" style={{ width: `${approvePct}%`, background: '#10b981' }} />
                        <div className="absolute h-full w-0.5" style={{ left: `${threshold}%`, background: '#fbbf24' }} title={`${threshold}% threshold`} />
                      </div>
                      {req.status === 'OWNER_REVIEW' && (
                        <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: '#f59e0b' }}>
                          <AlertTriangle size={11} /> Fewer than 5 investors — project owner approval required
                        </p>
                      )}
                    </div>
                  )}

                  {/* Resolution banner */}
                  {(req.status === 'APPROVED' || req.status === 'REJECTED') && (
                    <div className="flex items-start gap-2 p-3 rounded-lg" style={{
                      background: req.status === 'APPROVED' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                      border: `1px solid ${req.status === 'APPROVED' ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.2)'}`,
                    }}>
                      {req.status === 'APPROVED' ? <CheckCircle size={14} style={{ color: '#10b981', flexShrink: 0 }} /> : <XCircle size={14} style={{ color: '#f87171', flexShrink: 0 }} />}
                      <p className="text-xs" style={{ color: req.status === 'APPROVED' ? '#10b981' : '#f87171' }}>{req.resolutionNote}</p>
                    </div>
                  )}

                  {/* Evidence docs */}
                  <div>
                    <p className="text-xs font-semibold mb-2" style={{ color: '#6b7280' }}>EVIDENCE DOCUMENTS</p>
                    <div className="space-y-2">
                      {req.docs.map(doc => (
                        <div key={doc.id} className="rounded-lg p-3" style={{ background: '#080c10', border: '1px solid #1e2d3d' }}>
                          <div className="flex items-center gap-2 mb-1">
                            <FileText size={13} style={{ color: '#6b7280' }} />
                            <span className="text-xs font-medium flex-1 truncate" style={{ color: '#e8f4f0' }}>{doc.filename}</span>
                            <span className="text-[10px]" style={{ color: '#4b5563' }}>{(doc.sizeBytes / 1024).toFixed(1)} KB</span>
                          </div>
                          {doc.aiAnalysis ? (
                            <div className="mt-2 space-y-1">
                              <div className="flex items-center gap-2">
                                {doc.aiAnalysis.valid
                                  ? <ShieldCheck size={12} style={{ color: '#10b981' }} />
                                  : <ShieldAlert size={12} style={{ color: '#f59e0b' }} />}
                                <span className="text-[10px] font-semibold" style={{ color: doc.aiAnalysis.valid ? '#10b981' : '#f59e0b' }}>
                                  AI: {doc.aiAnalysis.docType} · Match score {doc.aiAnalysis.matchScore}/100
                                  {doc.aiAnalysis.extractedAmountMxn ? ` · Extracted ${fmt(doc.aiAnalysis.extractedAmountMxn)}` : ''}
                                </span>
                              </div>
                              <p className="text-[10px] leading-relaxed" style={{ color: '#9ca3af' }}>{doc.aiAnalysis.notes}</p>
                            </div>
                          ) : (
                            <p className="text-[10px] mt-1" style={{ color: '#4b5563' }}>AI analysis pending…</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Cost breakdown */}
                  {req.costs.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold mb-2" style={{ color: '#6b7280' }}>LOGGED COSTS</p>
                      <div className="space-y-1">
                        {req.costs.map(c => (
                          <div key={c.id} className="flex justify-between text-xs">
                            <span style={{ color: '#9ca3af' }}>{c.description} <span style={{ color: '#4b5563' }}>({c.category})</span></span>
                            <span style={{ color: '#e8f4f0' }}>{fmt(c.amountMxn)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between text-xs font-bold pt-1" style={{ borderTop: '1px solid #1e2d3d', color: '#f59e0b', marginTop: 4 }}>
                          <span>Total claimed</span>
                          <span>{fmt(req.totalCostMxn)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* My vote indicator */}
                  {myVote && (
                    <div className="flex items-center gap-2 p-2.5 rounded-lg" style={{ background: 'rgba(0,229,196,0.06)', border: '1px solid rgba(0,229,196,0.15)' }}>
                      <span className="text-xs" style={{ color: '#00e5c4' }}>You voted: <strong>{myVote.vote}</strong>{myVote.reason ? ` — "${myVote.reason}"` : ''}</span>
                    </div>
                  )}

                  {/* Vote action */}
                  {canVote && (
                    <div className="space-y-2">
                      <textarea
                        value={voteReasons[req.id] ?? ''}
                        onChange={e => setVoteReasons(r => ({ ...r, [req.id]: e.target.value }))}
                        placeholder="Optional: reason for your vote…"
                        rows={2}
                        className="w-full px-3 py-2 rounded-lg text-xs outline-none resize-none"
                        style={{ background: '#080c10', border: '1px solid #1e2d3d', color: '#e8f4f0' }}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => castVote(req.id, 'APPROVE')}
                          disabled={!!voting[req.id]}
                          className="flex-1 py-2.5 rounded-lg text-xs font-semibold disabled:opacity-50 flex items-center justify-center gap-1.5"
                          style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}
                        >
                          <CheckCircle size={13} /> Approve completion
                        </button>
                        <button
                          onClick={() => castVote(req.id, 'REJECT')}
                          disabled={!!voting[req.id]}
                          className="flex-1 py-2.5 rounded-lg text-xs font-semibold disabled:opacity-50 flex items-center justify-center gap-1.5"
                          style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
                        >
                          <XCircle size={13} /> Reject
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Owner decision */}
                  {canOwnerDecide && (
                    <div className="space-y-2">
                      <div className="p-2.5 rounded-lg" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
                        <p className="text-xs" style={{ color: '#f59e0b' }}>
                          <strong>Owner supervision required.</strong> Community has fewer than 5 investors. Review the evidence and decide.
                        </p>
                      </div>
                      <textarea
                        value={voteReasons[req.id] ?? ''}
                        onChange={e => setVoteReasons(r => ({ ...r, [req.id]: e.target.value }))}
                        placeholder="Notes for your decision…"
                        rows={2}
                        className="w-full px-3 py-2 rounded-lg text-xs outline-none resize-none"
                        style={{ background: '#080c10', border: '1px solid #1e2d3d', color: '#e8f4f0' }}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => ownerDecide(req.id, 'APPROVE')}
                          disabled={!!voting[req.id]}
                          className="flex-1 py-2.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                          style={{ background: '#10b981', color: '#080c10' }}
                        >
                          Approve & Release Payment
                        </button>
                        <button
                          onClick={() => ownerDecide(req.id, 'REJECT')}
                          disabled={!!voting[req.id]}
                          className="flex-1 py-2.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                          style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  )}

                  {error[req.id] && (
                    <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171' }}>{error[req.id]}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
