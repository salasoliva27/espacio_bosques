import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, getSession } from '../lib/auth';
import { useT } from '../context/LanguageContext';
import { Pencil, Check, X, ArrowLeft, TrendingUp, Layers, ChevronDown, ChevronUp, Send, Loader2, Trash2 } from 'lucide-react';
import type { User } from '@supabase/supabase-js';

interface SimInvestment {
  id: string;
  projectId: string;
  projectTitle: string;
  projectCategory: string;
  ethAmount: number;
  mxnAmount: number;
  createdAt: string;
}

interface ProviderService {
  id: string;
  name: string;
  description: string;
  deliverables: string[];
  typicalPriceMxn: string;
  chatMessages: { role: 'user' | 'assistant'; content: string }[];
  finalized: boolean;
  createdAt: string;
}

interface ProviderProfile {
  userId: string;
  enabled: boolean;
  companyName: string;
  specialty: string;
  rfc: string;
  services: ProviderService[];
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

// ── Inline AI Service Chat Panel ────────────────────────────────────────

interface ServiceChatPanelProps {
  token: string;
  onDone: () => void;
  onCancel: () => void;
}

function ServiceChatPanel({ token, onDone, onCancel }: ServiceChatPanelProps) {
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  // readySummary holds the extracted service data once AI signals completion
  const [readySummary, setReadySummary] = useState<{ name: string; description: string; deliverables: string[]; typicalPriceMxn: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  // Guard against React StrictMode double-invocation
  const startedRef = useRef(false);
  // Track message count so we know when enough has been said
  const [msgCount, setMsgCount] = useState(0);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    startService();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function startService() {
    try {
      const res = await fetch('/api/profile/provider/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to start service'); return; }
      setServiceId(data.service.id);
      const msgs = data.service.chatMessages || [];
      setMessages(msgs);
      setMsgCount(msgs.length);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function sendMessage() {
    if (!input.trim() || !serviceId || sending) return;
    const userMsg = input.trim();
    setInput('');
    setSending(true);
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);

    try {
      const res = await fetch(`/api/profile/provider/services/${serviceId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: userMsg }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Chat error'); setSending(false); return; }
      setMessages(prev => {
        const updated = [...prev, { role: 'assistant' as const, content: data.message }];
        setMsgCount(updated.length);
        return updated;
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  async function finalizeService() {
    if (!serviceId || finalizing) return;
    setFinalizing(true);
    setError('');
    try {
      const res = await fetch(`/api/profile/provider/services/${serviceId}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Could not extract service'); setFinalizing(false); return; }
      setReadySummary(data.service);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setFinalizing(false);
    }
  }

  async function saveService() {
    if (!serviceId || !readySummary) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/profile/provider/services/${serviceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ finalized: true }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || 'Failed to save service. Try again.');
        setSaving(false);
        return;
      }
      onDone();
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  }

  async function cancelAndCleanup() {
    // Delete the draft from backend so it doesn't become a ghost
    if (serviceId) {
      try {
        await fetch(`/api/profile/provider/services/${serviceId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {}
    }
    onCancel();
  }

  return (
    <div className="rounded-xl mt-3" style={{ background: '#0a1420', border: '1px solid #1e2d3d' }}>
      {/* Chat history */}
      <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className="rounded-xl px-3 py-2 text-sm max-w-[90%] leading-relaxed"
              style={msg.role === 'user'
                ? { background: 'rgba(0,229,196,0.1)', color: '#e8f4f0', border: '1px solid rgba(0,229,196,0.15)' }
                : { background: '#0d1520', color: '#9ca3af', border: '1px solid #1e2d3d' }
              }
            >
              {msg.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="rounded-xl px-3 py-2 text-sm" style={{ background: '#0d1520', border: '1px solid #1e2d3d', color: '#6b7280' }}>
              <Loader2 size={12} className="animate-spin inline mr-1" />Thinking…
            </div>
          </div>
        )}
        {!serviceId && !error && (
          <div className="flex justify-start">
            <div className="rounded-xl px-3 py-2 text-sm" style={{ background: '#0d1520', border: '1px solid #1e2d3d', color: '#6b7280' }}>
              <Loader2 size={12} className="animate-spin inline mr-1" />Starting…
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {error && <p className="px-4 pb-2 text-xs" style={{ color: '#f87171' }}>{error}</p>}

      {/* Ready — show summary + Save button */}
      {readySummary ? (
        <div className="p-4 space-y-3" style={{ borderTop: '1px solid #1e2d3d' }}>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#00e5c4' }}>Service ready to save</p>
          <div className="rounded-lg p-3 space-y-1.5" style={{ background: '#0d1520', border: '1px solid rgba(0,229,196,0.15)' }}>
            <p className="text-sm font-semibold" style={{ color: '#e8f4f0' }}>{readySummary.name}</p>
            {readySummary.description && (
              <p className="text-xs leading-relaxed" style={{ color: '#9ca3af' }}>{readySummary.description}</p>
            )}
            {readySummary.typicalPriceMxn && (
              <p className="text-xs font-medium" style={{ color: '#00e5c4' }}>{readySummary.typicalPriceMxn}</p>
            )}
            {readySummary.deliverables?.length > 0 && (
              <ul className="space-y-0.5 pt-1">
                {readySummary.deliverables.map((d, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs" style={{ color: '#6b7280' }}>
                    <span style={{ color: '#00e5c4', flexShrink: 0 }}>·</span>{d}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={saveService}
              disabled={saving}
              className="flex-1 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
              style={{ background: '#00e5c4', color: '#080c10' }}
            >
              {saving ? 'Saving…' : 'Save service'}
            </button>
            <button
              onClick={cancelAndCleanup}
              className="px-3 py-2 rounded-lg text-sm"
              style={{ background: '#1e2d3d', color: '#6b7280' }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        /* Still chatting */
        <div className="space-y-2 p-3" style={{ borderTop: '1px solid #1e2d3d' }}>
          {/* "I'm done" button — shown once there are at least 3 user messages */}
          {msgCount >= 7 && (
            <button
              onClick={finalizeService}
              disabled={finalizing || sending}
              className="w-full py-2 rounded-lg text-xs font-semibold disabled:opacity-50 transition-opacity hover:opacity-80"
              style={{ background: 'rgba(0,229,196,0.1)', color: '#00e5c4', border: '1px solid rgba(0,229,196,0.2)' }}
            >
              {finalizing
                ? <><Loader2 size={12} className="animate-spin inline mr-1.5" />Extracting service…</>
                : 'I\'m done describing my service →'}
            </button>
          )}
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
              style={{ background: '#111c2a', border: '1px solid #1e2d3d', color: '#e8f4f0' }}
              placeholder="Your response…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              disabled={sending || !serviceId || finalizing}
            />
            <button
              onClick={sendMessage}
              disabled={sending || !input.trim() || !serviceId || finalizing}
              className="p-2 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-40"
              style={{ background: 'rgba(0,229,196,0.1)', color: '#00e5c4', border: '1px solid rgba(0,229,196,0.2)' }}
            >
              <Send size={14} />
            </button>
            <button
              onClick={cancelAndCleanup}
              className="p-2 rounded-lg transition-opacity hover:opacity-70"
              style={{ background: '#1e2d3d', color: '#6b7280' }}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Profile Component ───────────────────────────────────────────────

export default function Profile() {
  const navigate = useNavigate();
  const t = useT();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string>('');
  const [investments, setInvestments] = useState<SimInvestment[]>([]);
  const [loadingInv, setLoadingInv] = useState(true);
  const [activeTab, setActiveTab] = useState<'member' | 'provider'>('member');

  // Projects created
  const [createdProjects, setCreatedProjects] = useState<any[]>([]);
  const [loadingCreated, setLoadingCreated] = useState(true);

  // Edit name state
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Provider state
  const [providerProfile, setProviderProfile] = useState<ProviderProfile | null>(null);
  const [loadingProvider, setLoadingProvider] = useState(false);
  const [savingProvider, setSavingProvider] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [rfc, setRfc] = useState('');
  const [showServiceChat, setShowServiceChat] = useState(false);
  const [expandedService, setExpandedService] = useState<string | null>(null);
  const [deletingService, setDeletingService] = useState<string | null>(null);

  // Personal info state (neighborhood is editable; RFC + birth_date are read-only from user_metadata)
  const [neighborhood, setNeighborhood] = useState('');
  const [editingNeighborhood, setEditingNeighborhood] = useState(false);
  const [neighborhoodInput, setNeighborhoodInput] = useState('');
  const [savingNeighborhood, setSavingNeighborhood] = useState(false);

  useEffect(() => {
    getSession().then(({ data: { session } }) => {
      if (!session) { navigate('/'); return; }
      setUser(session.user);
      setToken(session.access_token);
      setNameInput(session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || '');
      fetchInvestments(session.access_token);
      fetchUserProfile(session.access_token);
      fetchCreatedProjects(session.user.id);
    });
  }, [navigate]);

  useEffect(() => {
    if (activeTab === 'provider' && token && !providerProfile) {
      fetchProviderProfile();
    }
  }, [activeTab, token]);

  async function fetchInvestments(tok: string) {
    try {
      const res = await fetch('/api/invest/me', {
        headers: { Authorization: `Bearer ${tok}` },
      });
      if (res.ok) {
        const data = await res.json();
        setInvestments(data.investments ?? []);
      }
    } finally {
      setLoadingInv(false);
    }
  }

  async function fetchCreatedProjects(userId: string) {
    try {
      const res = await fetch(`/api/projects?planner=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setCreatedProjects(data.projects ?? []);
      }
    } finally {
      setLoadingCreated(false);
    }
  }

  async function fetchProviderProfile() {
    setLoadingProvider(true);
    try {
      const res = await fetch('/api/profile/provider', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.profile) {
        setProviderProfile(data.profile);
        setCompanyName(data.profile.companyName || '');
        setSpecialty(data.profile.specialty || '');
        setRfc(data.profile.rfc || '');
      } else {
        setProviderProfile(null);
      }
    } finally {
      setLoadingProvider(false);
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
      const { data: { session } } = await getSession();
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

  async function fetchUserProfile(tok: string) {
    try {
      const res = await fetch('/api/user/profile', { headers: { Authorization: `Bearer ${tok}` } });
      if (res.ok) {
        const data = await res.json();
        const nb = data.profile?.neighborhood ?? '';
        setNeighborhood(nb);
        setNeighborhoodInput(nb);
      }
    } catch { /* non-critical */ }
  }

  async function saveNeighborhood() {
    setSavingNeighborhood(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ neighborhood: neighborhoodInput.trim() }),
      });
      if (res.ok) {
        setNeighborhood(neighborhoodInput.trim());
        setEditingNeighborhood(false);
      }
    } finally {
      setSavingNeighborhood(false);
    }
  }

  const [providerEnableError, setProviderEnableError] = useState('');

  async function toggleProviderEnabled() {
    const newEnabled = !providerProfile?.enabled;
    setProviderEnableError('');
    setSavingProvider(true);
    try {
      const body: any = { enabled: newEnabled };
      if (newEnabled) {
        body.companyName = companyName;
        body.specialty = specialty;
        body.rfc = rfc;
      }
      const res = await fetch('/api/profile/provider', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setProviderProfile(data.profile);
        setCompanyName(data.profile.companyName || '');
        setSpecialty(data.profile.specialty || '');
        setRfc(data.profile.rfc || '');
      } else {
        setProviderEnableError(data.error || 'Could not enable provider profile.');
      }
    } finally {
      setSavingProvider(false);
    }
  }

  async function deleteService(serviceId: string) {
    setDeletingService(serviceId);
    try {
      const res = await fetch(`/api/profile/provider/services/${serviceId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setProviderProfile(p => p ? { ...p, services: p.services.filter(s => s.id !== serviceId) } : p);
        if (expandedService === serviceId) setExpandedService(null);
      }
    } catch {}
    setDeletingService(null);
  }

  async function saveProviderField(field: string, value: string) {
    try {
      const res = await fetch('/api/profile/provider', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ [field]: value }),
      });
      const data = await res.json();
      if (res.ok) {
        setProviderProfile(data.profile);
      }
    } catch {}
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
                  {providerProfile?.enabled && (
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(0,229,196,0.1)', color: '#00e5c4', border: '1px solid rgba(0,229,196,0.2)' }}
                    >
                      {t('provider.enabled_badge')}
                    </span>
                  )}
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

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ background: '#0d1520', border: '1px solid #1e2d3d' }}>
          {(['member', 'provider'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-1 py-2 text-sm font-medium rounded-lg transition-all"
              style={activeTab === tab
                ? { background: 'rgba(0,229,196,0.12)', color: '#00e5c4', border: '1px solid rgba(0,229,196,0.2)' }
                : { color: '#6b7280', border: '1px solid transparent' }
              }
            >
              {tab === 'member' ? t('member.tab') : t('provider.tab')}
            </button>
          ))}
        </div>

        {/* Member Tab */}
        {activeTab === 'member' && (
          <>
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

            {/* Personal Information */}
            <div className="rounded-xl mb-6" style={{ background: '#0d1520', border: '1px solid #1e2d3d' }}>
              <div className="px-5 py-4" style={{ borderBottom: '1px solid #1e2d3d' }}>
                <h2 className="text-sm font-semibold" style={{ color: '#e5e7eb' }}>Personal Information</h2>
              </div>
              <div className="px-5 py-4 space-y-4">
                {/* RFC */}
                <div>
                  <p className="text-xs mb-1" style={{ color: '#6b7280' }}>RFC</p>
                  <p className="text-sm font-mono" style={{ color: user?.user_metadata?.rfc ? '#e5e7eb' : '#4b5563' }}>
                    {user?.user_metadata?.rfc ?? '—'}
                  </p>
                </div>
                {/* Birth date */}
                <div>
                  <p className="text-xs mb-1" style={{ color: '#6b7280' }}>Birth date</p>
                  <p className="text-sm" style={{ color: user?.user_metadata?.birth_date ? '#e5e7eb' : '#4b5563' }}>
                    {user?.user_metadata?.birth_date
                      ? new Date(user.user_metadata.birth_date + 'T00:00:00').toLocaleDateString('en-MX', { year: 'numeric', month: 'long', day: 'numeric' })
                      : '—'}
                  </p>
                </div>
                {/* Neighborhood */}
                <div>
                  <p className="text-xs mb-1" style={{ color: '#6b7280' }}>Neighborhood</p>
                  {editingNeighborhood ? (
                    <div className="flex items-center gap-2">
                      <input
                        className="flex-1 text-sm px-3 py-1.5 rounded-lg outline-none"
                        style={{ background: '#1e2d3d', color: '#e5e7eb', border: '1px solid #2d3f54' }}
                        value={neighborhoodInput}
                        onChange={e => setNeighborhoodInput(e.target.value)}
                        placeholder="e.g. Polanco, Roma Norte…"
                        autoFocus
                      />
                      <button
                        onClick={saveNeighborhood}
                        disabled={savingNeighborhood}
                        className="p-1.5 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-40"
                        style={{ background: 'rgba(0,229,196,0.12)', color: '#00e5c4' }}
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => { setNeighborhoodInput(neighborhood); setEditingNeighborhood(false); }}
                        className="p-1.5 rounded-lg transition-opacity hover:opacity-80"
                        style={{ background: '#1e2d3d', color: '#6b7280' }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="text-sm" style={{ color: neighborhood ? '#e5e7eb' : '#4b5563' }}>
                        {neighborhood || '—'}
                      </p>
                      <button
                        onClick={() => setEditingNeighborhood(true)}
                        className="p-1 rounded-lg transition-opacity hover:opacity-80"
                        style={{ background: '#1e2d3d', color: '#6b7280' }}
                      >
                        <Pencil size={11} />
                      </button>
                    </div>
                  )}
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

            {/* Projects created */}
            <div className="rounded-xl mt-4" style={{ background: '#0d1520', border: '1px solid #1e2d3d' }}>
              <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #1e2d3d' }}>
                <h2 className="text-sm font-semibold" style={{ color: '#e5e7eb' }}>Projects created</h2>
                <button
                  onClick={() => navigate('/create')}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                  style={{ background: 'rgba(0,229,196,0.1)', color: '#00e5c4', border: '1px solid rgba(0,229,196,0.2)' }}
                >
                  + New project
                </button>
              </div>
              {loadingCreated ? (
                <div className="px-5 py-8 text-center">
                  <p className="text-sm" style={{ color: '#6b7280' }}>Loading...</p>
                </div>
              ) : createdProjects.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <p className="text-sm mb-3" style={{ color: '#6b7280' }}>You haven't created any projects yet.</p>
                  <button
                    onClick={() => navigate('/create')}
                    className="text-sm font-medium px-4 py-2 rounded-lg transition-opacity hover:opacity-80"
                    style={{ background: 'rgba(0,229,196,0.12)', color: '#00e5c4', border: '1px solid rgba(0,229,196,0.2)' }}
                  >
                    Pitch an idea
                  </button>
                </div>
              ) : (
                <ul>
                  {createdProjects.map((p, i) => {
                    const raised = Number(BigInt(p.fundingRaised || '0'));
                    const goal = Number(BigInt(p.fundingGoal || '1'));
                    const pct = goal > 0 ? Math.min(Math.round((raised / goal) * 100), 100) : 0;
                    return (
                      <li
                        key={p.id}
                        className="px-5 py-4 cursor-pointer transition-colors hover:bg-white/[0.02]"
                        style={{ borderTop: i > 0 ? '1px solid #1e2d3d' : undefined }}
                        onClick={() => navigate(`/projects/${p.id}`)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate mb-1" style={{ color: '#e5e7eb' }}>{p.title}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide" style={{ background: 'rgba(0,229,196,0.1)', color: '#00e5c4' }}>
                                {p.category}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-medium" style={{
                                background: p.status === 'ACTIVE' ? 'rgba(16,185,129,0.1)' : 'rgba(107,114,128,0.1)',
                                color: p.status === 'ACTIVE' ? '#10b981' : '#6b7280',
                              }}>
                                {p.status}
                              </span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-semibold mb-1" style={{ color: '#00e5c4' }}>{pct}% funded</p>
                            <div className="w-20 rounded-full h-1" style={{ background: '#1e2d3d' }}>
                              <div className="h-1 rounded-full" style={{ width: `${pct}%`, background: '#00e5c4' }} />
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </>
        )}

        {/* Provider Tab */}
        {activeTab === 'provider' && (
          <div className="space-y-5">
            {loadingProvider ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 size={24} className="animate-spin" style={{ color: '#00e5c4' }} />
              </div>
            ) : (
              <>
                {/* Enable toggle */}
                <div className="rounded-xl p-5" style={{ background: '#0d1520', border: '1px solid #1e2d3d' }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold" style={{ color: '#e5e7eb' }}>{t('provider.enable_toggle')}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
                        {providerProfile?.enabled
                          ? 'Your profile is visible to project managers.'
                          : 'Fill in your details below, then enable to submit bids.'}
                      </p>
                      {providerEnableError && (
                        <p className="text-xs mt-2 px-2 py-1.5 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171' }}>{providerEnableError}</p>
                      )}
                    </div>
                    <button
                      onClick={toggleProviderEnabled}
                      disabled={savingProvider}
                      className="relative w-12 h-6 rounded-full transition-colors flex-shrink-0 disabled:opacity-60"
                      style={{
                        background: providerProfile?.enabled ? '#00e5c4' : '#1e2d3d',
                        border: '1px solid ' + (providerProfile?.enabled ? '#00e5c4' : '#2d3f54'),
                      }}
                    >
                      <span
                        className="absolute top-0.5 w-5 h-5 rounded-full transition-transform"
                        style={{
                          background: providerProfile?.enabled ? '#080c10' : '#6b7280',
                          transform: providerProfile?.enabled ? 'translateX(1.5rem)' : 'translateX(0.125rem)',
                        }}
                      />
                    </button>
                  </div>
                </div>

                {/* Profile fields — always visible so user can fill before enabling */}
                {(
                  <div className="rounded-xl p-5 space-y-4" style={{ background: '#0d1520', border: '1px solid #1e2d3d' }}>
                    <h3 className="text-sm font-semibold" style={{ color: '#e5e7eb' }}>Provider Details</h3>

                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: '#6b7280' }}>
                        {t('provider.company_name')}
                      </label>
                      <input
                        className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                        style={{ background: '#111c2a', border: '1px solid #1e2d3d', color: '#e8f4f0' }}
                        value={companyName}
                        onChange={e => setCompanyName(e.target.value)}
                        placeholder="e.g. Contratos CDMX S.A. de C.V."
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: '#6b7280' }}>
                        {t('provider.specialty')}
                      </label>
                      <input
                        className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                        style={{ background: '#111c2a', border: '1px solid #1e2d3d', color: '#e8f4f0' }}
                        value={specialty}
                        onChange={e => setSpecialty(e.target.value)}
                        placeholder="e.g. LED Electrical Installation"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: '#6b7280' }}>
                        {t('provider.rfc')}
                      </label>
                      <input
                        className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                        style={{ background: '#111c2a', border: '1px solid #1e2d3d', color: '#e8f4f0' }}
                        value={rfc}
                        onChange={e => setRfc(e.target.value)}
                        placeholder="XAXX010101000"
                      />
                    </div>

                    <button
                      onClick={async () => {
                        setSavingProvider(true);
                        try {
                          const res = await fetch('/api/profile/provider', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                            body: JSON.stringify({ companyName, specialty, rfc }),
                          });
                          const data = await res.json();
                          if (res.ok) setProviderProfile(data.profile);
                        } finally {
                          setSavingProvider(false);
                        }
                      }}
                      disabled={savingProvider}
                      className="w-full py-2.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                      style={{ background: '#00e5c4', color: '#080c10' }}
                    >
                      {savingProvider ? 'Saving…' : 'Save Provider Details'}
                    </button>
                  </div>
                )}

                {/* Services */}
                {providerProfile && (
                  <div className="rounded-xl p-5" style={{ background: '#0d1520', border: '1px solid #1e2d3d' }}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold" style={{ color: '#e5e7eb' }}>{t('provider.services_title')}</h3>
                      {!showServiceChat && (
                        <button
                          onClick={() => setShowServiceChat(true)}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                          style={{ background: 'rgba(0,229,196,0.1)', color: '#00e5c4', border: '1px solid rgba(0,229,196,0.2)' }}
                        >
                          + {t('provider.add_service')}
                        </button>
                      )}
                    </div>

                    {/* Inline chat for adding a service */}
                    {showServiceChat && (
                      <ServiceChatPanel
                        token={token}
                        onDone={() => { setShowServiceChat(false); fetchProviderProfile(); }}
                        onCancel={() => { setShowServiceChat(false); fetchProviderProfile(); }}
                      />
                    )}

                    {/* Services list */}
                    {!providerProfile?.services || providerProfile.services.length === 0 ? (
                      <p className="text-sm mt-3" style={{ color: '#6b7280' }}>{t('provider.no_services')}</p>
                    ) : (
                      <div className="space-y-3 mt-3">
                        {providerProfile.services.map(svc => (
                          <div
                            key={svc.id}
                            className="rounded-lg"
                            style={{ background: '#0a1420', border: '1px solid #1e2d3d' }}
                          >
                            {/* Service header */}
                            <div className="flex items-center">
                              <button
                                className="flex-1 flex items-center justify-between p-4 text-left min-w-0"
                                onClick={() => setExpandedService(expandedService === svc.id ? null : svc.id)}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <p className="text-sm font-semibold truncate" style={{ color: '#e8f4f0' }}>
                                    {svc.name || 'Unnamed service'}
                                  </p>
                                  <span
                                    className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                    style={svc.finalized
                                      ? { background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }
                                      : { background: '#1e2d3d', color: '#6b7280', border: '1px solid #2d3f54' }
                                    }
                                  >
                                    {svc.finalized ? t('provider.service_finalized') : t('provider.service_draft')}
                                  </span>
                                </div>
                                {expandedService === svc.id
                                  ? <ChevronUp size={14} style={{ color: '#6b7280', flexShrink: 0 }} />
                                  : <ChevronDown size={14} style={{ color: '#6b7280', flexShrink: 0 }} />
                                }
                              </button>
                              {/* Delete button */}
                              <button
                                onClick={() => deleteService(svc.id)}
                                disabled={deletingService === svc.id}
                                className="p-3 transition-opacity hover:opacity-80 disabled:opacity-40"
                                title="Delete service"
                                style={{ color: '#6b7280' }}
                              >
                                {deletingService === svc.id
                                  ? <Loader2 size={14} className="animate-spin" />
                                  : <Trash2 size={14} />
                                }
                              </button>
                            </div>

                            {/* Expanded service details */}
                            {expandedService === svc.id && (
                              <div className="px-4 pb-4 space-y-3" style={{ borderTop: '1px solid #1e2d3d' }}>
                                {svc.description && (
                                  <p className="text-xs leading-relaxed pt-3" style={{ color: '#9ca3af' }}>{svc.description}</p>
                                )}
                                {svc.deliverables && svc.deliverables.length > 0 && (
                                  <div>
                                    <p className="text-xs font-semibold mb-1.5" style={{ color: '#6b7280' }}>{t('provider.deliverables')}</p>
                                    <ul className="space-y-1">
                                      {svc.deliverables.map((d, i) => (
                                        <li key={i} className="flex items-start gap-2 text-xs" style={{ color: '#9ca3af' }}>
                                          <span style={{ color: '#00e5c4', flexShrink: 0 }}>·</span>
                                          {d}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {svc.typicalPriceMxn && (
                                  <div className="flex items-center gap-2">
                                    <p className="text-xs font-semibold" style={{ color: '#6b7280' }}>{t('provider.price_range')}:</p>
                                    <p className="text-xs" style={{ color: '#00e5c4' }}>{svc.typicalPriceMxn}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Prompt to enable if not done */}
                {!providerProfile?.enabled && !loadingProvider && (
                  <p className="text-sm text-center" style={{ color: '#4b5563' }}>
                    Enable your provider profile above to register services and submit bids.
                  </p>
                )}
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
