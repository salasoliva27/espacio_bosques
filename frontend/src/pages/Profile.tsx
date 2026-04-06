import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/auth';
import { t } from '../lib/i18n';
import { Pencil, Check, X, ArrowLeft, TrendingUp, Layers } from 'lucide-react';
import type { User } from '@supabase/supabase-js';

const API = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001';

interface SimInvestment {
  id: string;
  projectId: string;
  projectTitle: string;
  projectCategory: string;
  ethAmount: number;
  mxnAmount: number;
  createdAt: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatMxn(n: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);
}

function initials(user: User): string {
  const name = user.user_metadata?.full_name as string | undefined;
  if (name) return name.charAt(0).toUpperCase();
  return (user.email ?? 'U').charAt(0).toUpperCase();
}

function memberSince(user: User): string {
  return new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
}

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [investments, setInvestments] = useState<SimInvestment[]>([]);
  const [loadingInv, setLoadingInv] = useState(true);

  // Edit name state
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { navigate('/'); return; }
      setUser(session.user);
      setNameInput(session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || '');
      fetchInvestments(session.access_token);
    });
  }, [navigate]);

  async function fetchInvestments(token: string) {
    try {
      const res = await fetch(`${API}/api/invest/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setInvestments(data.investments ?? []);
      }
    } finally {
      setLoadingInv(false);
    }
  }

  async function saveName() {
    if (!nameInput.trim()) return;
    setSaving(true);
    setSaveError('');
    const { error } = await supabase.auth.updateUser({ data: { full_name: nameInput.trim() } });
    if (error) {
      setSaveError(t('profile.save_error'));
    } else {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setUser(session.user);
      setEditing(false);
    }
    setSaving(false);
  }

  function cancelEdit() {
    setNameInput(user?.user_metadata?.full_name || user?.email?.split('@')[0] || '');
    setSaveError('');
    setEditing(false);
  }

  const totalMxn = investments.reduce((sum, inv) => sum + inv.mxnAmount, 0);
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || '—';

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#080c10' }}>
        <p style={{ color: '#9ca3af', fontSize: 14 }}>{t('app.loading')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#080c10' }}>
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Back */}
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 text-sm mb-6 transition-opacity hover:opacity-70"
          style={{ color: '#9ca3af' }}
        >
          <ArrowLeft size={14} />{t('project.back').replace('← ', '')}
        </button>

        {/* User card */}
        <div className="rounded-xl p-6 mb-6" style={{ background: '#0d1520', border: '1px solid #1e2d3d' }}>
          <div className="flex items-center gap-5">
            {/* Avatar */}
            <div
              className="flex items-center justify-center rounded-full text-2xl font-bold shrink-0"
              style={{ width: 64, height: 64, background: 'rgba(0,229,196,0.15)', color: '#00e5c4', border: '2px solid rgba(0,229,196,0.3)' }}
            >
              {initials(user)}
            </div>

            {/* Name + email */}
            <div className="flex-1 min-w-0">
              {editing ? (
                <div className="flex items-center gap-2 mb-1">
                  <input
                    autoFocus
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') cancelEdit(); }}
                    className="text-lg font-semibold rounded-md px-2 py-1 outline-none"
                    style={{ background: '#1e2d3d', color: '#e5e7eb', border: '1px solid #00e5c4', width: '100%', maxWidth: 280 }}
                  />
                  <button
                    onClick={saveName}
                    disabled={saving}
                    className="p-1.5 rounded-md transition-opacity hover:opacity-80"
                    style={{ background: 'rgba(0,229,196,0.15)', color: '#00e5c4' }}
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="p-1.5 rounded-md transition-opacity hover:opacity-80"
                    style={{ background: '#1e2d3d', color: '#9ca3af' }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg font-semibold truncate" style={{ color: '#e5e7eb' }}>{displayName}</span>
                  <button
                    onClick={() => setEditing(true)}
                    className="p-1.5 rounded-md transition-opacity hover:opacity-80"
                    style={{ background: '#1e2d3d', color: '#6b7280' }}
                    title={t('profile.edit_name')}
                  >
                    <Pencil size={12} />
                  </button>
                </div>
              )}
              {saveError && <p className="text-xs mb-1" style={{ color: '#f87171' }}>{saveError}</p>}
              <p className="text-sm truncate" style={{ color: '#6b7280' }}>{user.email}</p>
              <p className="text-xs mt-0.5" style={{ color: '#4b5563' }}>
                {t('profile.member_since')} {memberSince(user)}
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: '#0d1520', border: '1px solid #1e2d3d' }}>
            <div className="p-2 rounded-lg" style={{ background: 'rgba(0,229,196,0.1)' }}>
              <Layers size={16} style={{ color: '#00e5c4' }} />
            </div>
            <div>
              <p className="text-xs" style={{ color: '#6b7280' }}>{t('profile.stat_projects')}</p>
              <p className="text-xl font-bold" style={{ color: '#e5e7eb' }}>
                {new Set(investments.map(i => i.projectId)).size}
              </p>
            </div>
          </div>
          <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: '#0d1520', border: '1px solid #1e2d3d' }}>
            <div className="p-2 rounded-lg" style={{ background: 'rgba(0,229,196,0.1)' }}>
              <TrendingUp size={16} style={{ color: '#00e5c4' }} />
            </div>
            <div>
              <p className="text-xs" style={{ color: '#6b7280' }}>{t('profile.stat_invested')}</p>
              <p className="text-xl font-bold" style={{ color: '#e5e7eb' }}>{formatMxn(totalMxn)}</p>
            </div>
          </div>
        </div>

        {/* Investment history */}
        <div className="rounded-xl" style={{ background: '#0d1520', border: '1px solid #1e2d3d' }}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid #1e2d3d' }}>
            <h2 className="text-sm font-semibold" style={{ color: '#e5e7eb' }}>{t('profile.investments')}</h2>
          </div>

          {loadingInv ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm" style={{ color: '#6b7280' }}>{t('app.loading')}</p>
            </div>
          ) : investments.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm mb-3" style={{ color: '#6b7280' }}>{t('profile.no_investments')}</p>
              <button
                onClick={() => navigate('/dashboard')}
                className="text-sm font-medium px-4 py-2 rounded-lg transition-opacity hover:opacity-80"
                style={{ background: 'rgba(0,229,196,0.12)', color: '#00e5c4', border: '1px solid rgba(0,229,196,0.2)' }}
              >
                {t('profile.browse_projects')}
              </button>
            </div>
          ) : (
            <ul>
              {investments.map((inv, i) => (
                <li
                  key={inv.id}
                  className="px-5 py-4 flex items-center justify-between cursor-pointer transition-colors hover:bg-white/[0.02]"
                  style={{ borderTop: i > 0 ? '1px solid #1e2d3d' : undefined }}
                  onClick={() => navigate(`/projects/${inv.projectId}`)}
                >
                  <div className="min-w-0 mr-4">
                    <p className="text-sm font-medium truncate" style={{ color: '#e5e7eb' }}>{inv.projectTitle}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide"
                        style={{ background: 'rgba(0,229,196,0.1)', color: '#00e5c4' }}
                      >
                        {inv.projectCategory}
                      </span>
                      <span className="text-xs" style={{ color: '#6b7280' }}>{formatDate(inv.createdAt)}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold" style={{ color: '#00e5c4' }}>{formatMxn(inv.mxnAmount)}</p>
                    <p className="text-xs" style={{ color: '#4b5563' }}>{inv.ethAmount.toFixed(4)} ETH</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </div>
  );
}
