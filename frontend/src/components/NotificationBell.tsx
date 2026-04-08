/**
 * NotificationBell — bell icon + dropdown for the navbar.
 * Polls /api/notifications every 30s.
 */
import { useState, useEffect, useRef } from 'react';
import { Bell, CheckCheck, Briefcase, Activity, ShieldCheck, TrendingUp, X } from 'lucide-react';
import { supabase } from '../lib/auth';

interface Notif {
  id: string;
  type: string;
  title: string;
  body: string;
  projectId?: string;
  read: boolean;
  createdAt: string;
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  JOB_MATCH:            <Briefcase size={12} />,
  PROJECT_UPDATE:       <Activity size={12} />,
  EVIDENCE_REVIEW:      <ShieldCheck size={12} />,
  COMPLETION_SUBMITTED: <ShieldCheck size={12} />,
  MILESTONE_APPROVED:   <TrendingUp size={12} />,
  MILESTONE_REJECTED:   <X size={12} />,
  NEW_INVESTMENT:       <TrendingUp size={12} />,
  VOTE_RESULT:          <ShieldCheck size={12} />,
};

const TYPE_COLOR: Record<string, string> = {
  JOB_MATCH:            '#00e5c4',
  PROJECT_UPDATE:       '#3b82f6',
  EVIDENCE_REVIEW:      '#f59e0b',
  COMPLETION_SUBMITTED: '#f59e0b',
  MILESTONE_APPROVED:   '#10b981',
  MILESTONE_REJECTED:   '#f87171',
  NEW_INVESTMENT:       '#00e5c4',
  VOTE_RESULT:          '#9ca3af',
};

function timeAgo(iso: string) {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export default function NotificationBell() {
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  async function getToken() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }

  async function load() {
    const token = await getToken();
    if (!token) return;
    try {
      const r = await fetch('/api/notifications', { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) { const d = await r.json(); setNotifs(d.notifications ?? []); setUnread(d.unreadCount ?? 0); }
    } catch {}
  }

  useEffect(() => {
    load();
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, []);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function markAllRead() {
    const token = await getToken();
    await fetch('/api/notifications/mark-all-read', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    setNotifs(n => n.map(x => ({ ...x, read: true })));
    setUnread(0);
  }

  async function markRead(id: string) {
    const token = await getToken();
    await fetch(`/api/notifications/${id}/read`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
    setNotifs(n => n.map(x => x.id === id ? { ...x, read: true } : x));
    setUnread(u => Math.max(0, u - 1));
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(o => !o); if (!open) load(); }}
        className="relative flex items-center justify-center w-8 h-8 rounded-md transition-colors"
        style={{ background: '#1e2d3d', border: '1px solid #2a3f52' }}
      >
        <Bell size={14} style={{ color: '#9ca3af' }} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
            style={{ background: '#f59e0b', color: '#080c10' }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 rounded-xl shadow-xl z-50 overflow-hidden"
          style={{ background: '#0d1520', border: '1px solid #1e2d3d' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #1e2d3d' }}>
            <span className="text-sm font-semibold" style={{ color: '#e8f4f0' }}>Notifications</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="flex items-center gap-1 text-[10px] px-2 py-1 rounded" style={{ background: 'rgba(0,229,196,0.1)', color: '#00e5c4' }}>
                <CheckCheck size={10} /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto" style={{ maxHeight: 360 }}>
            {notifs.length === 0 ? (
              <p className="text-xs text-center py-8" style={{ color: '#4b5563' }}>No notifications yet</p>
            ) : notifs.map(n => {
              const color = TYPE_COLOR[n.type] ?? '#6b7280';
              const icon = TYPE_ICON[n.type] ?? <Bell size={12} />;
              return (
                <div
                  key={n.id}
                  onClick={() => !n.read && markRead(n.id)}
                  className="px-4 py-3 cursor-pointer transition-colors hover:bg-[#111d2b]"
                  style={{ borderBottom: '1px solid #0f1d2a', background: n.read ? 'transparent' : 'rgba(0,229,196,0.03)' }}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `${color}20`, color }}>
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold leading-tight" style={{ color: n.read ? '#6b7280' : '#e8f4f0' }}>{n.title}</p>
                        {!n.read && <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1" style={{ background: color }} />}
                      </div>
                      <p className="text-[10px] mt-0.5 leading-relaxed line-clamp-2" style={{ color: '#6b7280' }}>{n.body}</p>
                      <p className="text-[10px] mt-1" style={{ color: '#374151' }}>{timeAgo(n.createdAt)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
