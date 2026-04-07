import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { supabase, getSession } from '../lib/auth';
import { useT } from '../context/LanguageContext';
import { Sparkles, Send, ChevronRight, CheckCircle2, Clock, Layers, Banknote } from 'lucide-react';

interface Milestone {
  title: string;
  description: string;
  fundingPercentage: number;
  durationDays: number;
}

interface Blueprint {
  title: string;
  summary: string;
  category: string;
  estimatedBudgetMXN?: number;
  budgetJustification?: string;
  milestones: Milestone[];
  monitoringHints: string[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

// rawHistory must follow Anthropic's alternating user/assistant pattern (user first)
interface ApiMessage {
  role: 'user' | 'assistant';
  content: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  infrastructure: '#3b82f6', community: '#8b5cf6',
  environment: '#10b981', technology: '#00e5c4', education: '#f59e0b',
};

export default function CreateProject() {
  const [step, setStep] = useState<'pitch' | 'refine' | 'submitting'>('pitch');
  const [aiPrompt, setAiPrompt] = useState('');
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  // rawHistory: always starts user/assistant/user/... (Anthropic requirement)
  const [rawHistory, setRawHistory] = useState<ApiMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();
  const t = useT();

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, sending]);

  const handleGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setGenerating(true);
    try {
      const res = await axios.post('/api/ai/create-project', { prompt: aiPrompt });
      const bp: Blueprint = res.data.blueprint;
      setBlueprint(bp);
      const totalDays = bp.milestones.reduce((a, m) => a + m.durationDays, 0);
      const aiIntro = `I've built your blueprint: **${bp.title}**\n\n${bp.milestones.length} milestones across ${totalDays} days: ${bp.milestones.map(m => `${m.title} (${m.fundingPercentage}%)`).join(' → ')}.\n\nWhat do you want to change? Budget split, timeline, milestones, summary — anything.`;
      setChatMessages([{ role: 'assistant', text: aiIntro }]);
      setRawHistory([]); // starts empty — first user message will be index 0
      setStep('refine');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to generate blueprint');
    } finally {
      setGenerating(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !blueprint || sending) return;
    const userText = inputMessage.trim();
    setInputMessage('');
    setSending(true);

    const updatedChat: ChatMessage[] = [...chatMessages, { role: 'user', text: userText }];
    setChatMessages(updatedChat);

    // Build the user message for the API (embeds current blueprint for context)
    const userApiMsg: ApiMessage = {
      role: 'user',
      content: `Current blueprint:\n${JSON.stringify(blueprint, null, 2)}\n\nMy request: ${userText}`,
    };
    const historyToSend = [...rawHistory, userApiMsg];

    try {
      const res = await axios.post('/api/ai/refine-blueprint', {
        currentBlueprint: blueprint,
        message: userText,
        conversationHistory: rawHistory, // send history BEFORE this message; backend appends the user msg
      });

      setBlueprint(res.data.blueprint);
      setChatMessages([...updatedChat, { role: 'assistant', text: res.data.message }]);
      // Store the full exchange in history
      setRawHistory([...historyToSend, { role: 'assistant', content: res.data.message }]);
    } catch (err: any) {
      const errMsg = err.response?.data?.details || err.response?.data?.error || 'Failed to process. Please try again.';
      setChatMessages([...updatedChat, { role: 'assistant', text: errMsg }]);
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleSubmit = async () => {
    if (!blueprint) return;
    setStep('submitting');
    try {
      const { data: { session } } = await getSession();
      const plannerId = session?.user?.id || 'sim-user';
      // Convert MXN budget to wei: MXN ÷ 65,000 (ETH/MXN rate) × 1e18
      const ETH_MXN_RATE = 65_000;
      const budgetEth = blueprint.estimatedBudgetMXN ? blueprint.estimatedBudgetMXN / ETH_MXN_RATE : 10;
      const fundingGoalWei = BigInt(Math.round(budgetEth * 1e12)) * BigInt(1e6);
      await axios.post('/api/projects', {
        plannerId, title: blueprint.title, summary: blueprint.summary,
        category: blueprint.category, fundingGoal: fundingGoalWei.toString(),
        metadataURI: 'ipfs://generated', aiGenerated: true,
        aiBlueprint: blueprint, milestones: blueprint.milestones,
      });
      navigate('/dashboard');
    } catch {
      alert('Failed to create project');
      setStep('refine');
    }
  };

  const catColor = blueprint ? (CATEGORY_COLORS[blueprint.category] || '#6b7280') : '#6b7280';

  return (
    <div className="min-h-screen" style={{ background: '#080c10' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── PITCH ─────────────────────────────────────────── */}
        {step === 'pitch' && (
          <div className="max-w-2xl mx-auto">
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={18} style={{ color: '#00e5c4' }} />
                <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#00e5c4' }}>AI Blueprint</span>
              </div>
              <h1 className="text-2xl font-bold mb-2" style={{ color: '#e8f4f0' }}>{t('create.title')}</h1>
              <p className="text-sm" style={{ color: '#6b7280' }}>{t('create.step1_desc')}</p>
            </div>
            <div className="rounded-xl p-6" style={{ background: '#0d1520', border: '1px solid #1e2d3d' }}>
              <label className="block text-xs font-medium mb-3" style={{ color: '#9ca3af' }}>{t('create.step1_title')}</label>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                rows={6}
                className="w-full rounded-lg p-4 text-sm outline-none resize-none"
                style={{ background: '#080c10', border: '1px solid #1e2d3d', color: '#e8f4f0' }}
                placeholder={t('create.placeholder')}
                onKeyDown={(e) => { if (e.key === 'Enter' && e.metaKey) handleGenerate(); }}
              />
              <div className="flex items-center justify-between mt-4">
                <span className="text-xs" style={{ color: '#4b5563' }}>{t('create.cmd_hint')}</span>
                <button
                  onClick={handleGenerate}
                  disabled={generating || !aiPrompt.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-40"
                  style={{ background: '#00e5c4', color: '#080c10' }}
                >
                  {generating ? <><span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />{t('create.generating')}</> : <><Sparkles size={14} />{t('create.generate_btn')}</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── REFINE ─────────────────────────────────────────── */}
        {(step === 'refine' || step === 'submitting') && blueprint && (
          <div className="flex flex-col lg:flex-row gap-5" style={{ height: 'calc(100vh - 120px)' }}>

            {/* Blueprint panel (left, scrollable) */}
            <div className="lg:w-[42%] flex flex-col gap-3 min-h-0">
              <div className="flex items-center justify-between flex-shrink-0">
                <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#6b7280' }}>Blueprint</span>
                <button
                  onClick={handleSubmit}
                  disabled={step === 'submitting'}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                  style={{ background: '#00e5c4', color: '#080c10' }}
                >
                  {step === 'submitting'
                    ? <><span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />{t('create.submitting')}</>
                    : <><CheckCircle2 size={14} />{t('create.submit')}</>}
                </button>
              </div>

              {/* Scrollable blueprint card */}
              <div className="flex-1 overflow-y-auto rounded-xl" style={{ background: '#0d1520', border: '1px solid #1e2d3d' }}>
                <div style={{ height: 3, background: catColor }} />
                <div className="p-5 space-y-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: `${catColor}22`, color: catColor }}>
                        {blueprint.category}
                      </span>
                      <h3 className="text-lg font-bold mt-2 leading-snug" style={{ color: '#e8f4f0' }}>{blueprint.title}</h3>
                    </div>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: '#9ca3af' }}>{blueprint.summary}</p>

                  {/* Stats row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg p-3" style={{ background: '#080c10', border: '1px solid #1e2d3d' }}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Layers size={11} style={{ color: '#6b7280' }} />
                        <span className="text-xs" style={{ color: '#6b7280' }}>{t('create.label_milestones')}</span>
                      </div>
                      <span className="text-xl font-bold" style={{ color: '#e8f4f0' }}>{blueprint.milestones.length}</span>
                    </div>
                    <div className="rounded-lg p-3" style={{ background: '#080c10', border: '1px solid #1e2d3d' }}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Clock size={11} style={{ color: '#6b7280' }} />
                        <span className="text-xs" style={{ color: '#6b7280' }}>{t('create.label_duration')}</span>
                      </div>
                      <span className="text-xl font-bold" style={{ color: '#e8f4f0' }}>{blueprint.milestones.reduce((a, m) => a + m.durationDays, 0)}d</span>
                    </div>
                  </div>

                  {/* Budget estimate */}
                  {blueprint.estimatedBudgetMXN && (
                    <div className="rounded-lg p-4" style={{ background: 'rgba(0,229,196,0.05)', border: '1px solid rgba(0,229,196,0.2)' }}>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Banknote size={13} style={{ color: '#00e5c4' }} />
                        <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#00e5c4' }}>{t('create.label_budget')}</span>
                      </div>
                      <span className="text-2xl font-bold" style={{ color: '#e8f4f0' }}>
                        MXN {blueprint.estimatedBudgetMXN.toLocaleString('es-MX')}
                      </span>
                      {blueprint.budgetJustification && (
                        <p className="text-xs mt-2 leading-relaxed" style={{ color: '#6b7280' }}>{blueprint.budgetJustification}</p>
                      )}
                    </div>
                  )}

                  {/* Milestones */}
                  <div>
                    <p className="text-xs font-semibold mb-3 tracking-widest uppercase" style={{ color: '#4b5563' }}>{t('create.field_milestones')}</p>
                    <div className="space-y-3">
                      {blueprint.milestones.map((m, i) => (
                        <div key={i} className="flex gap-3">
                          <div className="flex flex-col items-center flex-shrink-0">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'rgba(0,229,196,0.12)', color: '#00e5c4', border: '1px solid rgba(0,229,196,0.2)' }}>{i + 1}</div>
                            {i < blueprint.milestones.length - 1 && <div className="w-px flex-1 my-1" style={{ background: '#1e2d3d' }} />}
                          </div>
                          <div className="flex-1 pb-2">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-sm font-semibold" style={{ color: '#e8f4f0' }}>{m.title}</span>
                              <div className="flex items-center gap-2">
                                {blueprint.estimatedBudgetMXN && (
                                  <span className="text-xs" style={{ color: '#6b7280' }}>
                                    MXN {Math.round(blueprint.estimatedBudgetMXN * m.fundingPercentage / 100).toLocaleString('es-MX')}
                                  </span>
                                )}
                                <span className="text-sm font-bold" style={{ color: '#00e5c4' }}>{m.fundingPercentage}%</span>
                              </div>
                            </div>
                            <p className="text-xs" style={{ color: '#6b7280' }}>{m.description}</p>
                            <span className="text-xs mt-1 inline-block" style={{ color: '#4b5563' }}>{m.durationDays} {t('create.days')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Monitoring hints */}
                  {blueprint.monitoringHints?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold mb-2 tracking-widest uppercase" style={{ color: '#4b5563' }}>{t('create.field_monitoring')}</p>
                      <ul className="space-y-1.5">
                        {blueprint.monitoringHints.map((hint, i) => (
                          <li key={i} className="text-xs flex gap-2" style={{ color: '#6b7280' }}>
                            <ChevronRight size={12} className="flex-shrink-0 mt-0.5" style={{ color: '#00e5c4' }} />
                            {hint}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Chat panel (right) */}
            <div className="lg:w-[58%] flex flex-col rounded-xl min-h-0" style={{ background: '#0d1520', border: '1px solid #1e2d3d' }}>
              {/* Chat header */}
              <div className="flex items-center gap-3 px-5 py-3 flex-shrink-0" style={{ borderBottom: '1px solid #1e2d3d' }}>
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#00e5c4' }} />
                <span className="text-sm font-medium" style={{ color: '#e8f4f0' }}>{t('create.chat_header')}</span>
                <span className="text-xs" style={{ color: '#6b7280' }}>{t('create.chat_hint')}</span>
              </div>

              {/* Messages — scrollable */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className="max-w-[88%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap"
                      style={msg.role === 'user'
                        ? { background: 'rgba(0,229,196,0.10)', color: '#e8f4f0', border: '1px solid rgba(0,229,196,0.18)' }
                        : { background: '#111d2b', color: '#9ca3af', border: '1px solid #1e2d3d' }}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                {sending && (
                  <div className="flex justify-start">
                    <div className="rounded-xl px-4 py-3.5" style={{ background: '#111d2b', border: '1px solid #1e2d3d' }}>
                      <span className="flex gap-1.5 items-center">
                        {[0,1,2].map(i => (
                          <span key={i} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: '#6b7280', animationDelay: `${i * 0.12}s` }} />
                        ))}
                      </span>
                    </div>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Input */}
              <div className="px-4 py-3 flex-shrink-0" style={{ borderTop: '1px solid #1e2d3d' }}>
                <div className="flex gap-2 items-end">
                  <textarea
                    ref={inputRef}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }}}
                    rows={2}
                    disabled={sending}
                    placeholder={t('create.chat_placeholder')}
                    className="flex-1 rounded-lg px-3 py-2.5 text-sm outline-none resize-none"
                    style={{ background: '#080c10', border: '1px solid #1e2d3d', color: '#e8f4f0' }}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={sending || !inputMessage.trim()}
                    className="p-2.5 rounded-lg transition-opacity hover:opacity-90 disabled:opacity-40 flex-shrink-0"
                    style={{ background: '#00e5c4', color: '#080c10' }}
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
