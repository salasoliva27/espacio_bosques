/**
 * /projects/:projectId/milestones/:milestoneId/propose
 * AI chat intake for provider bid proposals.
 * Provider submits scope, timeline, quote, experience through conversation.
 */
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, CheckCircle2, Sparkles } from 'lucide-react';
import { supabase, getSession } from '../lib/auth';

interface ChatMsg { role: 'user' | 'assistant'; content: string; }

export default function ProposalSubmit() {
  const { projectId, milestoneId } = useParams();
  const navigate = useNavigate();
  const [providers, setProviders] = useState<any[]>([]);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [proposalId, setProposalId] = useState('');
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [ready, setReady] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    // Load verified providers for selector
    fetch('/api/providers?status=VERIFIED', { headers: { Authorization: 'Bearer sim-token' } })
      .then(r => r.json()).then(d => setProviders(d.providers || []));
  }, []);

  async function startProposal() {
    const { data: { session } } = await getSession();
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? 'sim-token'}` };
    const r = await fetch('/api/governance/proposals', {
      method: 'POST', headers,
      body: JSON.stringify({ milestoneId, projectId, providerId: selectedProvider }),
    });
    const d = await r.json();
    setProposalId(d.proposal.id);
    setMessages([{ role: 'assistant', content: "Hi! I'll help you put together your bid. First — describe your proposed approach for this milestone. What will you do and how?" }]);
  }

  async function sendMessage() {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);
    const updated = [...messages, { role: 'user' as const, content: text }];
    setMessages(updated);
    const { data: { session } } = await getSession();
    const r = await fetch(`/api/governance/proposals/${proposalId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? 'sim-token'}` },
      body: JSON.stringify({ message: text }),
    });
    const d = await r.json();
    setMessages([...updated, { role: 'assistant', content: d.message }]);
    if (d.ready && d.summary) { setReady(true); setSummary(d.summary); }
    setSending(false);
  }

  async function submitProposal() {
    if (!summary) return;
    setSubmitting(true);
    const { data: { session } } = await getSession();
    await fetch(`/api/governance/proposals/${proposalId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? 'sim-token'}` },
      body: JSON.stringify(summary),
    });
    navigate(`/projects/${projectId}`);
  }

  const card = { background: '#0d1520', border: '1px solid #1e2d3d' };

  return (
    <div className="min-h-screen p-6" style={{ background: '#080c10' }}>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles size={16} style={{ color: '#00e5c4' }} />
          <h1 className="text-xl font-bold" style={{ color: '#e8f4f0' }}>Submit a Bid</h1>
        </div>

        {!proposalId ? (
          <div className="rounded-xl p-6 space-y-4" style={card}>
            <p className="text-sm" style={{ color: '#9ca3af' }}>Select your verified provider profile to start:</p>
            <select
              value={selectedProvider}
              onChange={e => setSelectedProvider(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={{ background: '#1e2d3d', border: '1px solid #2a3f52', color: '#e8f4f0' }}
            >
              <option value="">Choose provider…</option>
              {providers.map(p => <option key={p.id} value={p.id}>{p.name} ({p.rfc})</option>)}
            </select>
            <button
              onClick={startProposal} disabled={!selectedProvider}
              className="w-full py-2.5 rounded-xl text-sm font-bold"
              style={{ background: '#00e5c4', color: '#080c10', opacity: selectedProvider ? 1 : 0.4 }}
            >
              Start Proposal
            </button>
          </div>
        ) : (
          <div className="rounded-xl flex flex-col" style={{ ...card, height: '65vh' }}>
            <div className="flex items-center gap-2 px-5 py-3 flex-shrink-0" style={{ borderBottom: '1px solid #1e2d3d' }}>
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#00e5c4' }} />
              <span className="text-sm font-medium" style={{ color: '#e8f4f0' }}>Bid Assistant</span>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[88%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap"
                    style={m.role === 'user'
                      ? { background: 'rgba(0,229,196,0.10)', color: '#e8f4f0', border: '1px solid rgba(0,229,196,0.18)' }
                      : { background: '#111d2b', color: '#9ca3af', border: '1px solid #1e2d3d' }}>
                    {m.content}
                  </div>
                </div>
              ))}
              {sending && <div className="flex justify-start"><div className="rounded-xl px-4 py-3" style={{ background: '#111d2b', border: '1px solid #1e2d3d' }}><span className="flex gap-1.5">{[0,1,2].map(i=><span key={i} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: '#6b7280', animationDelay: `${i*0.12}s` }} />)}</span></div></div>}
              <div ref={bottomRef} />
            </div>
            <div className="px-4 py-3 flex-shrink-0" style={{ borderTop: '1px solid #1e2d3d' }}>
              {ready ? (
                <button onClick={submitProposal} disabled={submitting}
                  className="w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                  style={{ background: '#00e5c4', color: '#080c10' }}>
                  <CheckCircle2 size={15} /> {submitting ? 'Submitting…' : 'Submit Proposal'}
                </button>
              ) : (
                <div className="flex gap-2 items-end">
                  <textarea value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }}}
                    rows={2} disabled={sending} placeholder="Type your response… (Enter to send)"
                    className="flex-1 rounded-lg px-3 py-2.5 text-sm outline-none resize-none"
                    style={{ background: '#080c10', border: '1px solid #1e2d3d', color: '#e8f4f0' }} />
                  <button onClick={sendMessage} disabled={sending || !input.trim()}
                    className="p-2.5 rounded-lg disabled:opacity-40"
                    style={{ background: '#00e5c4', color: '#080c10' }}>
                    <Send size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
