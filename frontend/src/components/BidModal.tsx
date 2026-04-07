import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Send, Loader2 } from 'lucide-react';
import { supabase } from '../lib/auth';
import { useT } from '../context/LanguageContext';

interface BidModalProps {
  projectId: string;
  projectTitle: string;
  role: { id: string; role: string; description: string; milestoneId?: string };
  milestones: { id: string; title: string }[];
  onClose: () => void;
  onSubmitted: () => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function BidModal({ projectId, projectTitle, role, milestones, onClose, onSubmitted }: BidModalProps) {
  const t = useT();
  const navigate = useNavigate();
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [providerEnabled, setProviderEnabled] = useState(false);
  const [proposalId, setProposalId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [ready, setReady] = useState(false);
  const [readySummary, setReadySummary] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const milestoneId = role.milestoneId || milestones[0]?.id;
  const milestoneTitle = milestones.find(m => m.id === milestoneId)?.title || milestoneId;

  useEffect(() => {
    initBid();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function getToken(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }

  async function initBid() {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) { setError('Not authenticated'); setLoading(false); return; }

      // Check provider profile
      const profileRes = await fetch('/api/profile/provider', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const profileData = await profileRes.json();

      if (!profileData.profile?.enabled) {
        setProviderEnabled(false);
        setLoading(false);
        return;
      }
      setProviderEnabled(true);

      // Start proposal
      const propRes = await fetch('/api/governance/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ milestoneId, projectId, providerId: 'self' }),
      });
      const propData = await propRes.json();
      if (!propRes.ok) {
        setError(propData.error || 'Failed to start bid');
        setLoading(false);
        return;
      }

      const proposal = propData.proposal;
      setProposalId(proposal.id);

      // Use existing chat history or seed with a welcome message that mentions the role
      if (proposal.chatMessages && proposal.chatMessages.length > 0) {
        setMessages(proposal.chatMessages);
      } else {
        // Seed an initial context message about the role
        const services = profileData.profile?.services ?? [];
        const serviceNames = services.map((s: any) => s.name).filter(Boolean);
        const serviceContext = serviceNames.length > 0
          ? ` I can see you offer: ${serviceNames.join(', ')}.`
          : '';

        const welcomeMsg: ChatMessage = {
          role: 'assistant',
          content: `Hi! I'll help you put together a bid for the **${role.role}** role on **${projectTitle}**.\n\nRole: ${role.description}\nMilestone: ${milestoneTitle}${serviceContext}\n\nLet's build your proposal. What's your approach for this scope of work?`,
        };
        setMessages([welcomeMsg]);
      }
    } catch (err: any) {
      setError(err.message || 'Unexpected error');
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage() {
    if (!input.trim() || !proposalId || sending) return;
    const userMsg = input.trim();
    setInput('');
    setSending(true);
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);

    try {
      const token = await getToken();
      const res = await fetch(`/api/governance/proposals/${proposalId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: userMsg }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Chat error'); setSending(false); return; }

      setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
      if (data.ready) {
        setReady(true);
        setReadySummary(data.summary);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  async function submitBid() {
    if (!proposalId || !readySummary) return;
    setSubmitting(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/governance/proposals/${proposalId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          scope: readySummary.scope || '',
          approach: readySummary.approach || '',
          experience: readySummary.experience || '',
          quotedAmountMxn: readySummary.quotedAmountMxn || 1,
          timelineDays: readySummary.timelineDays || 30,
        }),
      });
      if (res.ok) {
        onSubmitted();
      } else {
        const d = await res.json();
        setError(d.error || 'Submit failed');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(8,12,16,0.92)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-2xl rounded-2xl flex flex-col"
        style={{ background: '#0d1520', border: '1px solid #1e2d3d', maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5" style={{ borderBottom: '1px solid #1e2d3d' }}>
          <div>
            <h2 className="text-base font-semibold" style={{ color: '#e8f4f0' }}>{t('bid.title')}</h2>
            <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
              {role.role} · {milestoneTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-opacity hover:opacity-70"
            style={{ background: '#1e2d3d', color: '#6b7280' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {loading ? (
            <div className="flex items-center justify-center flex-1 py-12">
              <Loader2 size={24} className="animate-spin" style={{ color: '#00e5c4' }} />
            </div>
          ) : !providerEnabled ? (
            <div className="flex flex-col items-center justify-center flex-1 py-12 px-6 text-center gap-4">
              <p className="text-sm" style={{ color: '#9ca3af' }}>{t('bid.no_provider')}</p>
              <button
                onClick={() => { onClose(); navigate('/profile'); }}
                className="text-sm font-medium px-4 py-2 rounded-lg transition-opacity hover:opacity-80"
                style={{ background: 'rgba(0,229,196,0.12)', color: '#00e5c4', border: '1px solid rgba(0,229,196,0.2)' }}
              >
                {t('bid.go_profile')}
              </button>
            </div>
          ) : (
            <>
              {/* Chat */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className="rounded-xl px-4 py-2.5 text-sm max-w-[85%] leading-relaxed whitespace-pre-wrap"
                      style={msg.role === 'user'
                        ? { background: 'rgba(0,229,196,0.12)', color: '#e8f4f0', border: '1px solid rgba(0,229,196,0.15)' }
                        : { background: '#111c2a', color: '#9ca3af', border: '1px solid #1e2d3d' }
                      }
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                {sending && (
                  <div className="flex justify-start">
                    <div className="rounded-xl px-4 py-2.5 text-sm" style={{ background: '#111c2a', border: '1px solid #1e2d3d', color: '#6b7280' }}>
                      <Loader2 size={14} className="animate-spin inline mr-1.5" />
                      Thinking…
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Error */}
              {error && (
                <div className="px-5 pb-2">
                  <p className="text-xs" style={{ color: '#f87171' }}>{error}</p>
                </div>
              )}

              {/* Input or submit */}
              {ready ? (
                <div className="p-5 flex flex-col gap-3" style={{ borderTop: '1px solid #1e2d3d' }}>
                  <p className="text-xs text-center" style={{ color: '#6b7280' }}>
                    Proposal ready. Review the chat above and submit your bid.
                  </p>
                  <button
                    onClick={submitBid}
                    disabled={submitting}
                    className="w-full py-2.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                    style={{ background: '#00e5c4', color: '#080c10' }}
                  >
                    {submitting ? 'Submitting…' : 'Submit Bid'}
                  </button>
                </div>
              ) : (
                <div className="p-4 flex gap-3" style={{ borderTop: '1px solid #1e2d3d' }}>
                  <input
                    className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none"
                    style={{ background: '#111c2a', border: '1px solid #1e2d3d', color: '#e8f4f0' }}
                    placeholder="Your response…"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    disabled={sending}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={sending || !input.trim()}
                    className="p-2.5 rounded-xl transition-opacity hover:opacity-80 disabled:opacity-40"
                    style={{ background: 'rgba(0,229,196,0.12)', color: '#00e5c4', border: '1px solid rgba(0,229,196,0.2)' }}
                  >
                    <Send size={16} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
