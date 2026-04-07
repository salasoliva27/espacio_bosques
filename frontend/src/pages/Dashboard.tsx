import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useT } from '../context/LanguageContext';
import { supabase } from '../lib/auth';

interface Project {
  id: string;
  title: string;
  summary: string;
  category: string;
  status: string;
  fundingGoal: string;
  fundingRaised: string;
  planner: { walletAddress: string };
  milestones: any[];
}

const CATEGORY_COLORS: Record<string, string> = {
  INFRASTRUCTURE: '#3b82f6',
  COMMUNITY: '#8b5cf6',
  ENVIRONMENTAL: '#10b981',
  TECHNOLOGY: '#00e5c4',
  EDUCATION: '#f59e0b',
  infrastructure: '#3b82f6',
  community: '#8b5cf6',
  environment: '#10b981',
  technology: '#00e5c4',
  education: '#f59e0b',
};

// Curated Unsplash photos per category — free, no attribution required
const CATEGORY_PHOTOS: Record<string, string> = {
  INFRASTRUCTURE: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&q=75',
  COMMUNITY: 'https://images.unsplash.com/photo-1444492417251-9c84a5fa18e0?auto=format&fit=crop&w=800&q=75',
  ENVIRONMENTAL: 'https://images.unsplash.com/photo-1569924370197-de82acfad0a4?auto=format&fit=crop&w=800&q=75',
  TECHNOLOGY: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=75',
  EDUCATION: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=800&q=75',
};

// ── Deposit Modal ─────────────────────────────────────────────────────────────

function DepositModal({ balance, onClose, onDeposited }: { balance: number; onClose: () => void; onDeposited: (newBalance: number) => void }) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const PRESETS = [500, 1000, 5000, 10000];

  async function handleDeposit() {
    const mxn = Number(amount);
    if (!mxn || isNaN(mxn) || mxn < 100) { setError('Minimum deposit is $100 MXN'); return; }
    if (mxn > 50000) { setError('Maximum deposit is $50,000 MXN per transaction'); return; }
    setLoading(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/balance/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ mxn }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Deposit failed'); setLoading(false); return; }
      onDeposited(data.balance);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  }

  const fmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: '#0d1520', border: '1px solid #1e2d3d' }}>
        <h2 className="text-base font-bold mb-1" style={{ color: '#e8f4f0' }}>Deposit Funds</h2>
        <p className="text-xs mb-4" style={{ color: '#6b7280' }}>
          Current balance: <span style={{ color: '#00e5c4' }}>{fmt(balance)}</span>
          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,229,196,0.08)', color: '#00e5c4' }}>SIM</span>
        </p>

        {/* Preset amounts */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {PRESETS.map(p => (
            <button
              key={p}
              onClick={() => setAmount(String(p))}
              className="py-2 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: amount === String(p) ? 'rgba(0,229,196,0.15)' : '#1e2d3d',
                color: amount === String(p) ? '#00e5c4' : '#9ca3af',
                border: amount === String(p) ? '1px solid rgba(0,229,196,0.3)' : '1px solid transparent',
              }}
            >
              {fmt(p)}
            </button>
          ))}
        </div>

        {/* Custom amount */}
        <div className="mb-4">
          <label className="block text-xs font-medium mb-1.5" style={{ color: '#6b7280' }}>Custom amount (MXN)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#6b7280' }}>$</span>
            <input
              type="number"
              min={100}
              max={50000}
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="1,000"
              className="w-full pl-7 pr-3 py-2.5 rounded-lg text-sm outline-none"
              style={{ background: '#111c2a', border: '1px solid #1e2d3d', color: '#e8f4f0' }}
              onKeyDown={e => { if (e.key === 'Enter') handleDeposit(); }}
            />
          </div>
        </div>

        <p className="text-xs mb-4 px-3 py-2 rounded-lg" style={{ background: 'rgba(0,229,196,0.06)', color: '#4b7c74', border: '1px solid rgba(0,229,196,0.1)' }}>
          Simulation: In production, you'd send SPEI to your Bitso account. Espacio Bosques never holds funds.
        </p>

        {error && <p className="text-xs mb-3 px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171' }}>{error}</p>}

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm" style={{ background: '#1e2d3d', color: '#9ca3af', border: '1px solid #2a3f52' }}>
            Cancel
          </button>
          <button
            onClick={handleDeposit}
            disabled={loading || !amount}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50"
            style={{ background: '#00e5c4', color: '#080c10' }}
          >
            {loading ? 'Depositing…' : 'Deposit'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<number | null>(null);
  const [showDeposit, setShowDeposit] = useState(false);
  const t = useT();

  useEffect(() => {
    fetchProjects();
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch('/api/balance/me', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBalance(data.mxn);
      }
    } catch {}
  };

  const fetchProjects = async () => {
    try {
      const response = await axios.get('/api/projects');
      setProjects(response.data.projects);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const toEth = (amount: string) => {
    try { return (Number(BigInt(amount)) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 2 }); }
    catch { return '0'; }
  };

  const pct = (raised: string, goal: string) => {
    try {
      const r = BigInt(raised), g = BigInt(goal);
      if (g === BigInt(0)) return 0;
      return Math.min(Number((r * BigInt(100)) / g), 100);
    } catch { return 0; }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#080c10' }}>
      <p style={{ color: '#6b7280', fontSize: 14 }}>{t('dashboard.loading')}</p>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: '#080c10' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#e8f4f0' }}>{t('dashboard.title')}</h1>
            <p className="mt-1 text-sm" style={{ color: '#6b7280' }}>{t('dashboard.subtitle')}</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Balance + Deposit */}
            {balance !== null && (
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className="text-xs" style={{ color: '#6b7280' }}>Balance</p>
                  <p className="text-sm font-bold" style={{ color: '#00e5c4' }}>
                    {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(balance)}
                  </p>
                </div>
                <button
                  onClick={() => setShowDeposit(true)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
                  style={{ background: 'rgba(0,229,196,0.1)', color: '#00e5c4', border: '1px solid rgba(0,229,196,0.2)' }}
                >
                  + Deposit
                </button>
              </div>
            )}
            <Link
              to="/create"
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ background: '#00e5c4', color: '#080c10' }}
            >
              + {t('nav.create')}
            </Link>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const progress = pct(project.fundingRaised, project.fundingGoal);
            const catColor = CATEGORY_COLORS[project.category] || '#6b7280';
            return (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className="group flex flex-col rounded-xl overflow-hidden transition-all hover:-translate-y-0.5"
                style={{ background: '#0d1520', border: '1px solid #1e2d3d' }}
              >
                {/* Cover photo */}
                <div className="relative h-40 overflow-hidden">
                  <img
                    src={CATEGORY_PHOTOS[project.category] || CATEGORY_PHOTOS.COMMUNITY}
                    alt={project.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div
                    className="absolute inset-0"
                    style={{ background: 'linear-gradient(to top, rgba(13,21,32,0.95) 0%, rgba(13,21,32,0.2) 60%, transparent 100%)' }}
                  />
                  {/* Status badge over photo */}
                  <div className="absolute top-3 right-3">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: 'rgba(8,12,16,0.7)', color: project.status === 'ACTIVE' ? '#10b981' : '#6b7280', backdropFilter: 'blur(4px)' }}>
                      ● {project.status}
                    </span>
                  </div>
                  {/* Category badge bottom-left */}
                  <div className="absolute bottom-3 left-3">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: `${catColor}33`, color: catColor, backdropFilter: 'blur(4px)' }}>
                      {project.category}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col flex-1 p-5">
                  {/* Category + status — hidden, now on photo */}
                  <div className="flex items-center justify-between mb-3 hidden">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: `${catColor}22`, color: catColor }}>
                      {project.category}
                    </span>
                    <span className="text-xs font-medium" style={{ color: project.status === 'ACTIVE' ? '#10b981' : '#6b7280' }}>
                      ● {project.status}
                    </span>
                  </div>

                  {/* Title + summary */}
                  <h3 className="font-semibold text-base mb-2 leading-snug" style={{ color: '#e8f4f0' }}>{project.title}</h3>
                  <p className="text-sm flex-1 mb-4 line-clamp-3" style={{ color: '#6b7280' }}>{project.summary}</p>

                  {/* Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs" style={{ color: '#9ca3af' }}>
                      <span>{t('dashboard.progress')}</span>
                      <span className="font-semibold" style={{ color: '#e8f4f0' }}>{progress}%</span>
                    </div>
                    <div className="w-full rounded-full h-1.5" style={{ background: '#1e2d3d' }}>
                      <div className="h-1.5 rounded-full transition-all" style={{ width: `${progress}%`, background: '#00e5c4' }} />
                    </div>
                    <div className="flex justify-between text-xs" style={{ color: '#6b7280' }}>
                      <span>{toEth(project.fundingRaised)} ETH raised</span>
                      <span>{project.milestones.length} milestones</span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {projects.length === 0 && (
          <div className="text-center py-20">
            <p style={{ color: '#6b7280' }}>{t('dashboard.empty')}</p>
          </div>
        )}
      </div>

      {showDeposit && (
        <DepositModal
          balance={balance ?? 0}
          onClose={() => setShowDeposit(false)}
          onDeposited={(newBalance) => {
            setBalance(newBalance);
            setShowDeposit(false);
          }}
        />
      )}
    </div>
  );
}
