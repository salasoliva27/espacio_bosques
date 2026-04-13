/**
 * AIInvestorPanel — live investment simulation powered by Claude Opus 4.6
 *
 * Floating panel (bottom-right). Toggle open/closed. Start/Stop the agent.
 * SSE stream drives real-time transaction feed and metrics.
 */
import { useState, useEffect, useRef, useCallback } from 'react';

interface InvestorPersona {
  id: string;
  name: string;
  avatar: string;
  style: string;
  minAmount: number;
  maxAmount: number;
}

interface AgentStats {
  running: boolean;
  totalInvested: number;
  txCount: number;
  passCount: number;
  activeInvestors: number;
  round: number;
  startedAt?: string;
}

interface FeedEntry {
  id: string;
  type: 'investment' | 'pass' | 'thinking' | 'status' | 'complete' | 'error';
  investor?: InvestorPersona;
  projectTitle?: string;
  amount?: number;
  txHash?: string;
  reasoning?: string;
  timestamp: string;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);

const short = (hash?: string) => hash ? `${hash.slice(0, 6)}…${hash.slice(-4)}` : '';

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return `${Math.round(diff / 1000)}s`;
  return `${Math.round(diff / 60000)}m`;
};

export default function AIInvestorPanel() {
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState<AgentStats>({ running: false, totalInvested: 0, txCount: 0, passCount: 0, activeInvestors: 0, round: 0 });
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const [thinking, setThinking] = useState<string | null>(null); // persona name currently thinking
  const [loading, setLoading] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);
  const esRef = useRef<EventSource | null>(null);

  // Auto-scroll feed to bottom on new entries
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [feed]);

  // SSE connection — always live while panel exists
  useEffect(() => {
    const es = new EventSource('/api/ai-investor/stream');
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);

        if (event.type === 'status' || event.type === 'complete') {
          if (event.stats) setStats(event.stats);
          if (event.type === 'complete') {
            setThinking(null);
            addFeedEntry({ id: `complete-${Date.now()}`, type: 'complete', timestamp: event.timestamp, reasoning: 'All investors finished their rounds.' });
          }
          return;
        }

        if (event.type === 'thinking') {
          setThinking(event.investor?.name ?? null);
          return;
        }

        if (event.type === 'investment') {
          setThinking(null);
          if (event.stats) setStats(event.stats);
          // Notify Dashboard (and any other listener) to refresh project data
          window.dispatchEvent(new CustomEvent('ai-investment'));
          addFeedEntry({
            id: `inv-${Date.now()}-${Math.random()}`,
            type: 'investment',
            investor: event.investor,
            projectTitle: event.projectTitle,
            amount: event.amount,
            txHash: event.txHash,
            reasoning: event.reasoning,
            timestamp: event.timestamp,
          });
          return;
        }

        if (event.type === 'pass') {
          setThinking(null);
          addFeedEntry({
            id: `pass-${Date.now()}-${Math.random()}`,
            type: 'pass',
            investor: event.investor,
            reasoning: event.reasoning,
            timestamp: event.timestamp,
          });
        }
      } catch { /* ignore parse errors */ }
    };

    es.onerror = () => {
      // SSE auto-reconnects — no action needed
    };

    return () => { es.close(); };
  }, []);

  const addFeedEntry = useCallback((entry: FeedEntry) => {
    setFeed(prev => [...prev.slice(-49), entry]); // keep last 50
  }, []);

  const handleStart = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai-investor/start', { method: 'POST' });
      const data = await res.json();
      if (data.status) setStats(data.status);
      setFeed([]);
      setThinking(null);
    } catch (err) {
      console.error('[ai-investor] start failed', err);
    }
    setLoading(false);
  };

  const handleStop = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai-investor/stop', { method: 'POST' });
      const data = await res.json();
      if (data.status) setStats(data.status);
      setThinking(null);
    } catch (err) {
      console.error('[ai-investor] stop failed', err);
    }
    setLoading(false);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {/* Expanded panel */}
      {open && (
        <div
          className="flex flex-col rounded-2xl overflow-hidden shadow-2xl"
          style={{
            width: 380,
            height: 540,
            background: '#0a1220',
            border: '1px solid #1e2d3d',
            boxShadow: '0 0 40px rgba(0,229,196,0.08)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{ background: '#0d1520', borderBottom: '1px solid #1e2d3d' }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  background: stats.running ? '#00e5c4' : '#374151',
                  boxShadow: stats.running ? '0 0 6px rgba(0,229,196,0.8)' : 'none',
                  animation: stats.running ? 'pulse 1.5s infinite' : 'none',
                }}
              />
              <span className="text-sm font-bold" style={{ color: '#e8f4f0' }}>AI Investor Engine</span>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                style={{ background: 'rgba(0,229,196,0.08)', color: '#00e5c4', border: '1px solid rgba(0,229,196,0.15)' }}
              >
                opus-4.6
              </span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-xs transition-opacity hover:opacity-60"
              style={{ color: '#6b7280' }}
            >
              ✕
            </button>
          </div>

          {/* Stats bar */}
          <div
            className="grid grid-cols-4 gap-0 flex-shrink-0"
            style={{ borderBottom: '1px solid #1e2d3d' }}
          >
            {[
              { label: 'Invested', value: stats.totalInvested >= 1000 ? `$${(stats.totalInvested / 1000).toFixed(1)}k` : `$${stats.totalInvested}`, sub: 'MXN' },
              { label: 'Txns', value: stats.txCount, sub: `${stats.passCount} pass` },
              { label: 'Investors', value: stats.activeInvestors, sub: 'of 8' },
              { label: 'Round', value: stats.round, sub: stats.running ? 'live' : 'idle' },
            ].map(({ label, value, sub }) => (
              <div key={label} className="flex flex-col items-center py-2.5 px-1" style={{ borderRight: '1px solid #1e2d3d' }}>
                <span className="text-[10px] font-medium" style={{ color: '#6b7280' }}>{label}</span>
                <span className="text-sm font-bold" style={{ color: '#00e5c4' }}>{value}</span>
                <span className="text-[9px]" style={{ color: '#374151' }}>{sub}</span>
              </div>
            ))}
          </div>

          {/* Thinking indicator */}
          {thinking && (
            <div
              className="flex items-center gap-2 px-4 py-2 flex-shrink-0"
              style={{ background: 'rgba(0,229,196,0.04)', borderBottom: '1px solid #1e2d3d' }}
            >
              <div className="flex gap-0.5">
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className="w-1 h-1 rounded-full"
                    style={{
                      background: '#00e5c4',
                      animation: `bounce 1.2s ${i * 0.2}s infinite`,
                      opacity: 0.7,
                    }}
                  />
                ))}
              </div>
              <span className="text-[11px]" style={{ color: '#4b7c74' }}>
                {thinking} is analyzing...
              </span>
            </div>
          )}

          {/* Feed */}
          <div
            ref={feedRef}
            className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5"
            style={{ scrollbarWidth: 'thin', scrollbarColor: '#1e2d3d transparent' }}
          >
            {feed.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-2">
                <span className="text-3xl opacity-40">🤖</span>
                <p className="text-xs text-center" style={{ color: '#374151' }}>
                  {stats.running ? 'Waiting for first transaction...' : 'Start the agent to see live investments'}
                </p>
              </div>
            )}

            {feed.map((entry) => {
              if (entry.type === 'investment') {
                return (
                  <div
                    key={entry.id}
                    className="flex items-start gap-2.5 rounded-xl px-3 py-2.5"
                    style={{
                      background: 'rgba(0,229,196,0.06)',
                      border: '1px solid rgba(0,229,196,0.12)',
                      animation: 'fadeSlideIn 0.3s ease',
                    }}
                  >
                    <span className="text-lg leading-none mt-0.5">{entry.investor?.avatar}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-xs font-semibold truncate" style={{ color: '#e8f4f0' }}>
                          {entry.investor?.name}
                        </span>
                        <span className="text-xs font-bold flex-shrink-0" style={{ color: '#00e5c4' }}>
                          {fmt(entry.amount ?? 0)}
                        </span>
                      </div>
                      <p className="text-[11px] truncate mb-1" style={{ color: '#6b7280' }}>
                        → {entry.projectTitle}
                      </p>
                      {entry.reasoning && (
                        <p className="text-[10px] italic" style={{ color: '#4b7c74' }}>
                          "{entry.reasoning}"
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        {entry.txHash && (
                          <span className="text-[9px] font-mono" style={{ color: '#374151' }}>
                            tx {short(entry.txHash)}
                          </span>
                        )}
                        <span className="text-[9px]" style={{ color: '#374151' }}>
                          {timeAgo(entry.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }

              if (entry.type === 'pass') {
                return (
                  <div
                    key={entry.id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                    style={{ background: 'rgba(30,45,61,0.5)' }}
                  >
                    <span className="text-sm">{entry.investor?.avatar}</span>
                    <span className="text-[10px]" style={{ color: '#374151' }}>
                      {entry.investor?.name} passed — {entry.reasoning}
                    </span>
                  </div>
                );
              }

              if (entry.type === 'complete') {
                return (
                  <div
                    key={entry.id}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl"
                    style={{ background: 'rgba(0,229,196,0.04)', border: '1px dashed rgba(0,229,196,0.2)' }}
                  >
                    <span className="text-sm">🏁</span>
                    <span className="text-xs font-semibold" style={{ color: '#00e5c4' }}>
                      Session complete — {stats.txCount} transactions
                    </span>
                  </div>
                );
              }

              return null;
            })}
          </div>

          {/* Controls */}
          <div
            className="flex gap-2 px-4 py-3 flex-shrink-0"
            style={{ borderTop: '1px solid #1e2d3d', background: '#0d1520' }}
          >
            {!stats.running ? (
              <button
                onClick={handleStart}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                style={{ background: '#00e5c4', color: '#080c10' }}
              >
                {loading ? 'Starting...' : '▶ Start Simulation'}
              </button>
            ) : (
              <button
                onClick={handleStop}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                {loading ? 'Stopping...' : '■ Stop Agent'}
              </button>
            )}
            <button
              onClick={() => setFeed([])}
              className="px-3 py-2.5 rounded-xl text-xs transition-opacity hover:opacity-70"
              style={{ background: '#1e2d3d', color: '#6b7280' }}
              title="Clear feed"
            >
              ↺
            </button>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold shadow-lg transition-all hover:scale-105"
        style={{
          background: stats.running ? 'rgba(0,229,196,0.12)' : '#0d1520',
          color: stats.running ? '#00e5c4' : '#9ca3af',
          border: stats.running ? '1px solid rgba(0,229,196,0.3)' : '1px solid #1e2d3d',
          boxShadow: stats.running ? '0 0 20px rgba(0,229,196,0.15)' : '0 4px 20px rgba(0,0,0,0.4)',
        }}
      >
        <span>{stats.running ? '🤖' : '🤖'}</span>
        <span>AI Investors</span>
        {stats.running && (
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: '#00e5c4', boxShadow: '0 0 6px rgba(0,229,196,0.8)', animation: 'pulse 1.5s infinite' }}
          />
        )}
        {stats.txCount > 0 && (
          <span
            className="text-xs px-1.5 py-0.5 rounded-full font-bold"
            style={{ background: 'rgba(0,229,196,0.15)', color: '#00e5c4' }}
          >
            {stats.txCount}
          </span>
        )}
      </button>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}
