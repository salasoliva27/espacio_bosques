/**
 * VotingSection — per-milestone proposals + live vote counts + cast vote.
 * Renders only for milestones that have submitted proposals or an open voting window.
 */
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/auth';
import { useT, useLanguage } from '../context/LanguageContext';
import { Vote, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

interface Milestone { id: string; title: string; status: string; }
interface Props { projectId: string; milestones: Milestone[]; }

interface Proposal {
  id: string;
  providerName: string;
  quotedAmountMxn: number;
  timelineDays: number;
  scope: string;
  approach: string;
  experience: string;
}

interface VoteState {
  results: { proposalId: string; votes: number }[];
  totalVotes: number;
  myVote: string | null;
  votingOpen: boolean;
  votingDeadline: string | null;
}

function fmt(n: number) {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
}

function MilestoneVoting({ projectId, milestone }: { projectId: string; milestone: Milestone }) {
  const t = useT();
  const { lang } = useLanguage();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [voteState, setVoteState] = useState<VoteState | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [voting, setVoting] = useState(false);
  const [open, setOpen] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);
  const [disbursing, setDisbursing] = useState<string | null>(null);
  const [txDone, setTxDone] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const h = { Authorization: `Bearer ${session?.access_token ?? 'sim-token'}` };

    const [pRes, vRes] = await Promise.all([
      fetch(`/api/governance/milestones/${milestone.id}/proposals`, { headers: h }),
      fetch(`/api/governance/milestones/${milestone.id}/votes`, { headers: h }),
    ]);
    if (pRes.ok) { const d = await pRes.json(); setProposals(d.proposals || []); }
    if (vRes.ok) { const d = await vRes.json(); setVoteState(d); }
  }, [milestone.id]);

  useEffect(() => { load(); }, [load]);

  if (!voteState?.votingOpen && proposals.length === 0) return null;

  async function approveWinner(proposalId: string) {
    setApproving(proposalId);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`/api/governance/proposals/${proposalId}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session?.access_token ?? 'sim-token'}` },
    });
    if (res.ok) await load();
    setApproving(null);
  }

  async function disbursePayment(proposalId: string) {
    setDisbursing(proposalId);
    const { data: { session } } = await supabase.auth.getSession();
    const cfdiUuid = `SIM-${Date.now()}-CFDI`;
    const res = await fetch(`/api/governance/proposals/${proposalId}/disburse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? 'sim-token'}` },
      body: JSON.stringify({ cfdiUuid }),
    });
    if (res.ok) {
      setTxDone(proposalId);
      await load();
    }
    setDisbursing(null);
  }

  async function castVote(proposalId: string) {
    if (voting || voteState?.myVote) return;
    setVoting(true);
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`/api/governance/milestones/${milestone.id}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? 'sim-token'}` },
      body: JSON.stringify({ proposalId }),
    });
    await load();
    setVoting(false);
  }

  const deadline = voteState?.votingDeadline ? new Date(voteState.votingDeadline) : null;

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#0d1520', border: '1px solid #1e2d3d' }}>
      {/* Header */}
      <button
        className="w-full flex items-center justify-between px-5 py-4"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-2.5">
          <Vote size={15} style={{ color: '#00e5c4' }} />
          <span className="text-sm font-semibold" style={{ color: '#e8f4f0' }}>
            {t('gov.voting_milestone', { title: milestone.title })}
          </span>
          {voteState?.votingOpen && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(0,229,196,0.12)', color: '#00e5c4' }}>
              {t('gov.voting_open')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: '#6b7280' }}>
            {voteState?.totalVotes ?? 0} {t('gov.votes')}
            {deadline && ` · ${t('gov.closes', { date: deadline.toLocaleDateString(lang === 'en' ? 'en-US' : 'es-MX', { day: 'numeric', month: 'short' }) })}`}
          </span>
          {open ? <ChevronUp size={14} style={{ color: '#6b7280' }} /> : <ChevronDown size={14} style={{ color: '#6b7280' }} />}
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-3">
          {proposals.length === 0 ? (
            <p className="text-sm" style={{ color: '#6b7280' }}>{t('gov.no_proposals')}</p>
          ) : (
            proposals.map(p => {
              const voteCount = voteState?.results.find(r => r.proposalId === p.id)?.votes ?? 0;
              const pct = voteState?.totalVotes ? Math.round((voteCount / voteState.totalVotes) * 100) : 0;
              const isMyVote = voteState?.myVote === p.id;
              const isWinning = voteState?.results[0]?.proposalId === p.id && voteCount > 0;

              return (
                <div key={p.id} className="rounded-lg p-4" style={{ background: '#111d2b', border: `1px solid ${isMyVote ? 'rgba(0,229,196,0.3)' : '#1e2d3d'}` }}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold truncate" style={{ color: '#e8f4f0' }}>{p.providerName}</span>
                        {isWinning && <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>{t('gov.leading')}</span>}
                        {isMyVote && <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: 'rgba(0,229,196,0.12)', color: '#00e5c4' }}>{t('gov.your_vote')}</span>}
                      </div>
                      <div className="flex gap-3 text-xs mt-0.5" style={{ color: '#6b7280' }}>
                        <span>{fmt(p.quotedAmountMxn)}</span>
                        <span>{p.timelineDays} {t('create.days')}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-lg font-bold tabular-nums" style={{ color: '#e8f4f0' }}>{voteCount}</div>
                      <div className="text-xs" style={{ color: '#6b7280' }}>{pct}%</div>
                    </div>
                  </div>

                  {/* Vote bar */}
                  <div className="w-full h-1.5 rounded-full mb-3" style={{ background: '#1e2d3d' }}>
                    <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: '#00e5c4' }} />
                  </div>

                  {/* Expandable scope */}
                  <button
                    className="text-xs flex items-center gap-1 mb-2 hover:opacity-80"
                    style={{ color: '#6b7280' }}
                    onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                  >
                    {expanded === p.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    {expanded === p.id ? t('gov.hide_details') : t('gov.show_details')}
                  </button>

                  {expanded === p.id && (
                    <div className="space-y-2 text-xs mb-3" style={{ color: '#9ca3af' }}>
                      {p.scope && <p><span className="font-medium" style={{ color: '#e8f4f0' }}>{t('gov.scope')} </span>{p.scope}</p>}
                      {p.approach && <p><span className="font-medium" style={{ color: '#e8f4f0' }}>{t('gov.approach')} </span>{p.approach}</p>}
                      {p.experience && <p><span className="font-medium" style={{ color: '#e8f4f0' }}>{t('gov.experience')} </span>{p.experience}</p>}
                    </div>
                  )}

                  {/* Vote button */}
                  {voteState?.votingOpen && !voteState.myVote && (
                    <button
                      onClick={() => castVote(p.id)}
                      disabled={voting}
                      className="mt-1 w-full py-2 rounded-lg text-xs font-bold transition-opacity hover:opacity-90 disabled:opacity-40"
                      style={{ background: '#00e5c4', color: '#080c10' }}
                    >
                      {voting ? t('gov.voting_btn') : t('gov.vote_btn')}
                    </button>
                  )}

                  {/* Approve winner (when voting closed, proposal is leading and not yet winner) */}
                  {!voteState?.votingOpen && (p as any).status !== 'WINNER' && isWinning && (
                    <button
                      onClick={() => approveWinner(p.id)}
                      disabled={approving === p.id}
                      className="mt-1 w-full py-2 rounded-lg text-xs font-bold transition-opacity hover:opacity-90 disabled:opacity-40"
                      style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}
                    >
                      {approving === p.id ? 'Approving…' : '✓ Approve as Winner'}
                    </button>
                  )}

                  {/* Winner badge + Disburse button */}
                  {(p as any).status === 'WINNER' && (
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
                          ✓ Selected Winner
                        </span>
                        <span className="text-xs font-bold" style={{ color: '#00e5c4' }}>{fmt(p.quotedAmountMxn)}</span>
                      </div>
                      {txDone === p.id ? (
                        <p className="text-xs text-center py-2" style={{ color: '#10b981' }}>✓ Payment disbursed — recorded in ledger</p>
                      ) : (
                        <button
                          onClick={() => disbursePayment(p.id)}
                          disabled={disbursing === p.id}
                          className="w-full py-2 rounded-lg text-xs font-bold transition-opacity hover:opacity-90 disabled:opacity-40"
                          style={{ background: 'rgba(0,229,196,0.12)', color: '#00e5c4', border: '1px solid rgba(0,229,196,0.25)' }}
                        >
                          {disbursing === p.id ? 'Processing…' : `Disburse ${fmt(p.quotedAmountMxn)} to Provider`}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Quorum indicator */}
          {voteState && (
            <div className="flex items-center gap-2 text-xs pt-1" style={{ color: '#6b7280' }}>
              <div className="w-24 h-1.5 rounded-full" style={{ background: '#1e2d3d' }}>
                <div className="h-1.5 rounded-full" style={{
                  width: `${Math.min(voteState.totalVotes > 0 ? 40 : 0, 100)}%`,
                  background: voteState.totalVotes > 0 ? '#3b82f6' : '#374151'
                }} />
              </div>
              <span>{t('gov.quorum')}</span>
            </div>
          )}

          {/* Link to submit a proposal */}
          {voteState?.votingOpen && (
            <Link
              to={`/projects/${projectId}/milestones/${milestone.id}/propose`}
              className="inline-flex items-center gap-1.5 text-xs font-medium hover:opacity-80"
              style={{ color: '#00e5c4' }}
            >
              <ExternalLink size={11} /> {t('gov.submit_bid')}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export default function VotingSection({ projectId, milestones }: Props) {
  const t = useT();
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold" style={{ color: '#e8f4f0' }}>{t('gov.section_title')}</h2>
      {milestones.map(m => (
        <MilestoneVoting key={m.id} projectId={projectId} milestone={m} />
      ))}
    </div>
  );
}
