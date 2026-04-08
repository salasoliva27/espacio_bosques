/**
 * MoneyFlowDiagram — shows contributors → escrow → milestones → providers
 * with exact MXN amounts at every node. Pure SVG, no external deps.
 */
import { useState, useEffect } from 'react';

interface DiagramData {
  projectTitle: string;
  totalMxn: number;
  fundingGoalMxn: number;
  contributors: { id: string; name: string; mxn: number }[];
  milestones: { id: string; title: string; fundingPct: number; allocatedMxn: number; disbursedMxn: number; docsCount: number; completed: boolean; status: string }[];
  providers: { id: string; name: string; receivedMxn: number; milestones: string[] }[];
  events: { id: string; type: string; actorName?: string; mxnAmount: number; milestoneTitle?: string; createdAt: string }[];
}

function fmt(n: number) {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const TYPE_COLOR: Record<string, string> = { INVEST: '#00e5c4', DISBURSE: '#f59e0b', REFUND: '#f87171' };

interface Props { projectId: string }

export default function MoneyFlowDiagram({ projectId }: Props) {
  const [data, setData] = useState<DiagramData | null>(null);
  const [tab, setTab] = useState<'diagram' | 'log'>('diagram');

  useEffect(() => {
    fetch(`/api/moneyflow/${projectId}/diagram`)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {});
  }, [projectId]);

  if (!data) return null;
  if (data.totalMxn === 0) return (
    <div className="rounded-xl p-6" style={{ background: '#0d1520', border: '1px solid #1e2d3d' }}>
      <h2 className="text-base font-semibold mb-2" style={{ color: '#e8f4f0' }}>Money Flow</h2>
      <p className="text-sm" style={{ color: '#6b7280' }}>No investments yet. Money flow diagram will appear once funding begins.</p>
    </div>
  );

  const BAR_MAX = data.fundingGoalMxn > 0 ? data.fundingGoalMxn : data.totalMxn;
  const fundingPct = Math.min(Math.round(data.totalMxn / BAR_MAX * 100), 100);

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#0d1520', border: '1px solid #1e2d3d' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #1e2d3d' }}>
        <div>
          <h2 className="text-base font-semibold" style={{ color: '#e8f4f0' }}>Money Flow</h2>
          <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>Full transparency — track every peso from contributor to provider</p>
        </div>
        <div className="flex gap-1">
          {(['diagram', 'log'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="text-xs px-3 py-1.5 rounded-lg transition-opacity"
              style={tab === t
                ? { background: 'rgba(0,229,196,0.15)', color: '#00e5c4', border: '1px solid rgba(0,229,196,0.3)' }
                : { background: 'transparent', color: '#6b7280', border: '1px solid transparent' }}>
              {t === 'diagram' ? 'Flow' : 'Event Log'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'diagram' ? (
        <div className="p-6 space-y-6">
          {/* Summary bar */}
          <div className="rounded-lg p-4" style={{ background: '#0a1420', border: '1px solid #1e2d3d' }}>
            <div className="flex justify-between text-xs mb-2" style={{ color: '#9ca3af' }}>
              <span>Total raised: <span className="font-bold" style={{ color: '#00e5c4' }}>{fmt(data.totalMxn)}</span></span>
              <span>Goal: {fmt(data.fundingGoalMxn)}</span>
            </div>
            <div className="w-full rounded-full h-2" style={{ background: '#1e2d3d' }}>
              <div className="h-2 rounded-full transition-all" style={{ width: `${fundingPct}%`, background: '#00e5c4' }} />
            </div>
          </div>

          {/* Three-column flow */}
          <div className="grid grid-cols-3 gap-4 items-start">
            {/* Contributors */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#6b7280' }}>Contributors</p>
              {data.contributors.map(c => (
                <div key={c.id} className="rounded-lg p-3" style={{ background: '#0a1420', border: '1px solid rgba(0,229,196,0.15)' }}>
                  <p className="text-xs font-medium truncate" style={{ color: '#e8f4f0' }}>{c.name}</p>
                  <p className="text-sm font-bold mt-0.5" style={{ color: '#00e5c4' }}>{fmt(c.mxn)}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: '#4b5563' }}>
                    {data.totalMxn > 0 ? Math.round(c.mxn / data.totalMxn * 100) : 0}% of pool
                  </p>
                </div>
              ))}
            </div>

            {/* Escrow / Milestones */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#6b7280' }}>Escrow → Milestones</p>
              {/* Escrow node */}
              <div className="rounded-lg p-3 mb-3" style={{ background: 'rgba(0,229,196,0.08)', border: '1px solid rgba(0,229,196,0.25)' }}>
                <p className="text-xs font-semibold" style={{ color: '#00e5c4' }}>Community Escrow</p>
                <p className="text-sm font-bold" style={{ color: '#e8f4f0' }}>{fmt(data.totalMxn)}</p>
                <p className="text-[10px]" style={{ color: '#6b7280' }}>Held until milestones approve</p>
              </div>
              {data.milestones.map(m => (
                <div key={m.id} className="rounded-lg p-3" style={{
                  background: m.completed ? 'rgba(16,185,129,0.08)' : '#0a1420',
                  border: `1px solid ${m.completed ? 'rgba(16,185,129,0.3)' : '#1e2d3d'}`
                }}>
                  <p className="text-xs font-medium truncate" style={{ color: '#e8f4f0' }}>{m.title}</p>
                  <p className="text-sm font-bold" style={{ color: m.completed ? '#10b981' : '#9ca3af' }}>{fmt(m.allocatedMxn)}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px]" style={{ color: '#4b5563' }}>{m.fundingPct}% of pool</span>
                    {m.docsCount > 0 && <span className="text-[10px] px-1 rounded" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>{m.docsCount} docs</span>}
                    {m.completed && <span className="text-[10px] px-1 rounded" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>✓ done</span>}
                  </div>
                  {m.disbursedMxn > 0 && (
                    <p className="text-[10px] mt-1" style={{ color: '#f59e0b' }}>Disbursed: {fmt(m.disbursedMxn)}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Providers */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#6b7280' }}>Providers Paid</p>
              {data.providers.length === 0 ? (
                <div className="rounded-lg p-3" style={{ background: '#0a1420', border: '1px solid #1e2d3d' }}>
                  <p className="text-xs" style={{ color: '#4b5563' }}>No disbursements yet</p>
                </div>
              ) : data.providers.map(p => (
                <div key={p.id} className="rounded-lg p-3" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <p className="text-xs font-medium truncate" style={{ color: '#e8f4f0' }}>{p.name}</p>
                  <p className="text-sm font-bold" style={{ color: '#f59e0b' }}>{fmt(p.receivedMxn)}</p>
                  <p className="text-[10px] mt-0.5 truncate" style={{ color: '#6b7280' }}>{p.milestones.join(', ')}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Event Log */
        <div className="p-6">
          {data.events.length === 0 ? (
            <p className="text-sm" style={{ color: '#6b7280' }}>No events yet.</p>
          ) : (
            <div className="space-y-2">
              {data.events.map(ev => (
                <div key={ev.id} className="flex items-center gap-3 py-2.5 px-3 rounded-lg" style={{ background: '#0a1420', border: '1px solid #1e2d3d' }}>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded flex-shrink-0" style={{ background: `${TYPE_COLOR[ev.type]}20`, color: TYPE_COLOR[ev.type] }}>
                    {ev.type}
                  </span>
                  <span className="text-sm font-medium flex-1 truncate" style={{ color: '#e8f4f0' }}>
                    {ev.actorName ?? ev.type} {ev.milestoneTitle ? `→ ${ev.milestoneTitle}` : ''}
                  </span>
                  <span className="text-sm font-bold tabular-nums flex-shrink-0" style={{ color: TYPE_COLOR[ev.type] }}>
                    {fmt(ev.mxnAmount)}
                  </span>
                  <span className="text-[10px] flex-shrink-0" style={{ color: '#4b5563' }}>{fmtDate(ev.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
