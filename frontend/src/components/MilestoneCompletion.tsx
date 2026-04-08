/**
 * MilestoneCompletion — provider UI to log costs + upload evidence docs,
 * then submit to mark a milestone as complete.
 */
import { useState, useEffect, useRef } from 'react';
import { X, Plus, Upload, CheckCircle, FileText, Loader2 } from 'lucide-react';
import { supabase } from '../lib/auth';

interface CostItem { description: string; amountMxn: number; category: string }
interface Doc { id: string; filename: string; mimeType: string; sizeBytes: number; validated: boolean; uploadedAt: string }
interface Props {
  projectId: string;
  milestone: { id: string; title: string; fundingPercentage: number; status: string };
  onClose: () => void;
  onCompleted: () => void;
}

const COST_CATS = ['labor', 'materials', 'equipment', 'services', 'other'];

function fmt(n: number) { return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }); }

export default function MilestoneCompletion({ projectId, milestone, onClose, onCompleted }: Props) {
  const [costs, setCosts] = useState<CostItem[]>([{ description: '', amountMxn: 0, category: 'labor' }]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState('');
  const [costSaved, setCostSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { loadDocs(); }, []);

  async function getToken() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }

  async function loadDocs() {
    const r = await fetch(`/api/moneyflow/${projectId}/milestones/${milestone.id}/documents`);
    if (r.ok) { const d = await r.json(); setDocs(d.docs ?? []); }
  }

  async function saveCosts() {
    const token = await getToken();
    setSaving(true); setError('');
    try {
      for (const c of costs.filter(c => c.description && c.amountMxn > 0)) {
        await fetch(`/api/moneyflow/${projectId}/milestones/${milestone.id}/costs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(c),
        });
      }
      setCostSaved(true);
    } catch { setError('Failed to save costs'); }
    finally { setSaving(false); }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['application/pdf', 'text/xml', 'application/xml'];
    if (!allowed.includes(file.type) && !file.name.endsWith('.xml')) {
      setError('Only PDF or XML (CFDI) files allowed'); return;
    }
    setUploading(true); setError('');
    const token = await getToken();
    // For sim: read as base64 (only for small files <500KB, otherwise metadata only)
    let dataBase64: string | undefined;
    if (file.size < 500_000) {
      dataBase64 = await new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });
    }
    try {
      const res = await fetch(`/api/moneyflow/${projectId}/milestones/${milestone.id}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ filename: file.name, mimeType: file.type || 'text/xml', sizeBytes: file.size, dataBase64 }),
      });
      if (res.ok) { await loadDocs(); }
      else { const d = await res.json(); setError(d.error ?? 'Upload failed'); }
    } catch { setError('Upload failed'); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  }

  async function completeMilestone() {
    if (docs.length === 0) { setError('Upload at least one evidence document first'); return; }
    const token = await getToken();
    setCompleting(true); setError('');
    const totalCost = costs.reduce((s, c) => s + (c.amountMxn || 0), 0);
    try {
      const res = await fetch(`/api/moneyflow/${projectId}/milestones/${milestone.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amountMxn: totalCost }),
      });
      if (res.ok) { onCompleted(); }
      else { const d = await res.json(); setError(d.error ?? 'Failed to complete milestone'); }
    } catch { setError('Network error'); }
    finally { setCompleting(false); }
  }

  const totalCost = costs.reduce((s, c) => s + (Number(c.amountMxn) || 0), 0);
  const alreadyCompleted = milestone.status === 'COMPLETED';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(8,12,16,0.92)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-2xl rounded-2xl flex flex-col" style={{ background: '#0d1520', border: '1px solid #1e2d3d', maxHeight: '90vh' }}>
        {/* Header */}
        <div className="flex items-start justify-between p-5" style={{ borderBottom: '1px solid #1e2d3d' }}>
          <div>
            <h2 className="text-base font-semibold" style={{ color: '#e8f4f0' }}>Milestone Completion</h2>
            <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>{milestone.title} · {milestone.fundingPercentage}% of project budget</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ background: '#1e2d3d', color: '#6b7280' }}><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {alreadyCompleted && (
            <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}>
              <CheckCircle size={16} style={{ color: '#10b981' }} />
              <span className="text-sm" style={{ color: '#10b981' }}>This milestone is already completed.</span>
            </div>
          )}

          {/* Cost logging */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold" style={{ color: '#e8f4f0' }}>Cost Log</h3>
              {costSaved && <span className="text-xs" style={{ color: '#10b981' }}>✓ Saved</span>}
            </div>
            <div className="space-y-2">
              {costs.map((c, i) => (
                <div key={i} className="grid grid-cols-12 gap-2">
                  <input className="col-span-5 px-2.5 py-2 rounded-lg text-xs outline-none" placeholder="Description (e.g. Labor day 1)"
                    style={{ background: '#0a1420', border: '1px solid #1e2d3d', color: '#e8f4f0' }}
                    value={c.description} onChange={e => setCosts(prev => prev.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} />
                  <input type="number" className="col-span-3 px-2.5 py-2 rounded-lg text-xs outline-none" placeholder="MXN"
                    style={{ background: '#0a1420', border: '1px solid #1e2d3d', color: '#e8f4f0' }}
                    value={c.amountMxn || ''} onChange={e => setCosts(prev => prev.map((x, j) => j === i ? { ...x, amountMxn: Number(e.target.value) } : x))} />
                  <select className="col-span-3 px-2 py-2 rounded-lg text-xs outline-none" style={{ background: '#0a1420', border: '1px solid #1e2d3d', color: '#e8f4f0' }}
                    value={c.category} onChange={e => setCosts(prev => prev.map((x, j) => j === i ? { ...x, category: e.target.value } : x))}>
                    {COST_CATS.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                  <button className="col-span-1 text-xs rounded-lg" style={{ color: '#6b7280' }}
                    onClick={() => setCosts(prev => prev.filter((_, j) => j !== i))}>✕</button>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-3">
              <button onClick={() => setCosts(prev => [...prev, { description: '', amountMxn: 0, category: 'other' }])}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded" style={{ background: 'rgba(0,229,196,0.1)', color: '#00e5c4' }}>
                <Plus size={12} /> Add line
              </button>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold" style={{ color: '#e8f4f0' }}>Total: {fmt(totalCost)}</span>
                <button onClick={saveCosts} disabled={saving || alreadyCompleted}
                  className="text-xs px-3 py-1.5 rounded-lg disabled:opacity-50"
                  style={{ background: 'rgba(0,229,196,0.12)', color: '#00e5c4', border: '1px solid rgba(0,229,196,0.2)' }}>
                  {saving ? 'Saving…' : 'Save costs'}
                </button>
              </div>
            </div>
          </div>

          {/* Document upload */}
          <div>
            <h3 className="text-sm font-semibold mb-3" style={{ color: '#e8f4f0' }}>Evidence Documents</h3>
            <p className="text-xs mb-3" style={{ color: '#6b7280' }}>Upload CFDIs (XML) or invoices (PDF). At least one required to complete the milestone.</p>
            {docs.length > 0 && (
              <div className="space-y-2 mb-3">
                {docs.map(doc => (
                  <div key={doc.id} className="flex items-center gap-3 p-2.5 rounded-lg" style={{ background: '#0a1420', border: '1px solid #1e2d3d' }}>
                    <FileText size={14} style={{ color: doc.validated ? '#10b981' : '#9ca3af' }} />
                    <span className="text-xs flex-1 truncate" style={{ color: '#e8f4f0' }}>{doc.filename}</span>
                    <span className="text-[10px]" style={{ color: '#4b5563' }}>{(doc.sizeBytes / 1024).toFixed(1)} KB</span>
                    {doc.validated
                      ? <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>✓ validated</span>
                      : <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>pending</span>}
                  </div>
                ))}
              </div>
            )}
            <label className="flex items-center gap-2 text-xs px-3 py-2.5 rounded-lg cursor-pointer w-fit transition-opacity hover:opacity-80"
              style={{ background: 'rgba(0,229,196,0.08)', color: '#00e5c4', border: '1px solid rgba(0,229,196,0.2)' }}>
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {uploading ? 'Uploading…' : 'Upload PDF or XML'}
              <input ref={fileRef} type="file" className="hidden" accept=".pdf,.xml,application/pdf,text/xml,application/xml" onChange={handleFileUpload} />
            </label>
          </div>

          {error && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171' }}>{error}</p>}
        </div>

        {/* Footer */}
        <div className="p-5" style={{ borderTop: '1px solid #1e2d3d' }}>
          <button onClick={completeMilestone} disabled={completing || alreadyCompleted || docs.length === 0}
            className="w-full py-3 rounded-xl text-sm font-semibold disabled:opacity-40 transition-opacity hover:opacity-90"
            style={{ background: docs.length > 0 ? '#00e5c4' : '#1e2d3d', color: docs.length > 0 ? '#080c10' : '#4b5563' }}>
            {completing ? 'Submitting…' : alreadyCompleted ? 'Already completed' : docs.length === 0 ? 'Upload at least 1 document to submit' : `Submit Evidence for Community Review`}
          </button>
          {docs.length === 0 && !alreadyCompleted && (
            <p className="text-[10px] text-center mt-2" style={{ color: '#4b5563' }}>Evidence documents required — community will vote before payment is released</p>
          )}
        </div>
      </div>
    </div>
  );
}
