/**
 * /providers — Admin provider registry
 *
 * Lists verified contractors/vendors. Admins can:
 * - Register new providers (with RFC + CLABE validation feedback)
 * - Upload documents (CFDI XML/PDF, contracts, photos)
 * - Verify or reject providers
 *
 * CFDI XML uploads are parsed server-side — UUID, emisor RFC, total displayed.
 */
import { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Clock, XCircle, Upload, Plus, ChevronDown, ChevronRight, FileText, AlertTriangle, Wrench } from 'lucide-react';
import { useT } from '../context/LanguageContext';
import { getSession } from '../lib/auth';

// Use relative path — Vite proxy forwards /api/* to the backend (see vite.config.ts)
const API = '';

// ── Types ────────────────────────────────────────────────────────────────────

interface CfdiData {
  uuid: string;
  emisorRfc: string;
  receptorRfc: string;
  total: number;
  fecha: string;
  concepto: string;
}

interface ProviderDoc {
  id: string;
  type: string;
  filename: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  cfdiData?: CfdiData;
  uploadedAt: string;
}

interface ServiceItem {
  id: string;
  name: string;
  description: string;
  priceRange?: string;
}

interface Provider {
  id: string;
  userId?: string;
  name: string;
  tipoPersona: 'fisica' | 'moral';
  rfc: string;
  curp?: string;
  clabe: string;
  email: string;
  phone?: string;
  specialty: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  efosStatus: 'NOT_CHECKED' | 'CLEAR' | 'FLAGGED';
  documents: ProviderDoc[];
  documentCount?: number;
  services: ServiceItem[];
  createdAt: string;
  updatedAt: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getAuthHeaders() {
  const { data: { session } } = await getSession();
  return { Authorization: `Bearer ${session?.access_token ?? 'sim-token'}` };
}

// ── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Provider['status'] }) {
  const t = useT();
  const config = {
    VERIFIED: { icon: ShieldCheck, color: '#00e5c4', bg: 'rgba(0,229,196,0.12)', label: t('providers.status_verified') },
    PENDING:  { icon: Clock,       color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: t('providers.status_pending') },
    REJECTED: { icon: XCircle,     color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  label: t('providers.status_rejected') },
  }[status];
  const Icon = config.icon;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: config.bg, color: config.color }}>
      <Icon size={10} /> {config.label}
    </span>
  );
}

function EfosBadge({ status }: { status: Provider['efosStatus'] }) {
  const t = useT();
  const config = {
    NOT_CHECKED: { color: '#6b7280', label: t('providers.efos_not_checked') },
    CLEAR:       { color: '#00e5c4', label: t('providers.efos_clear') },
    FLAGGED:     { color: '#ef4444', label: t('providers.efos_flagged') },
  }[status];
  return <span className="text-xs" style={{ color: config.color }}>{config.label}</span>;
}

// ── Add provider form ─────────────────────────────────────────────────────────

const SPECIALTIES = ['Construcción civil', 'Electricidad', 'Plomería', 'Paisajismo y jardinería', 'Señalización', 'Tecnología', 'Otro'];

function AddProviderModal({ onClose, onCreated }: { onClose: () => void; onCreated: (p: Provider) => void }) {
  const t = useT();
  const [form, setForm] = useState({
    name: '', tipoPersona: 'moral' as 'fisica' | 'moral',
    rfc: '', curp: '', clabe: '', email: '', phone: '', specialty: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API}/api/providers`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Error'); setLoading(false); return; }
      onCreated(data.provider);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  }

  const field = (label: string, key: keyof typeof form, opts?: { placeholder?: string; required?: boolean }) => (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: '#9ca3af' }}>{label}{opts?.required !== false && ' *'}</label>
      <input
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        placeholder={opts?.placeholder}
        className="w-full px-3 py-2 rounded-lg text-sm outline-none"
        style={{ background: '#1e2d3d', border: '1px solid #2a3f52', color: '#e8f4f0' }}
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="w-full max-w-lg rounded-2xl p-6" style={{ background: '#0d1520', border: '1px solid #1e2d3d' }}>
        <h2 className="text-lg font-bold mb-5" style={{ color: '#e8f4f0' }}>{t('providers.form_title')}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {field(t('providers.name'), 'name')}

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#9ca3af' }}>{t('providers.tipo')} *</label>
            <div className="flex gap-3">
              {(['moral', 'fisica'] as const).map(v => (
                <label key={v} className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: form.tipoPersona === v ? '#00e5c4' : '#9ca3af' }}>
                  <input type="radio" name="tipo" value={v} checked={form.tipoPersona === v} onChange={() => setForm(f => ({ ...f, tipoPersona: v }))} className="accent-teal-400" />
                  {v === 'moral' ? t('providers.tipo_moral') : t('providers.tipo_fisica')}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {field(t('providers.rfc'), 'rfc', { placeholder: form.tipoPersona === 'moral' ? 'CBS200101ABC' : 'MEGC850301XY2' })}
            {form.tipoPersona === 'fisica'
              ? field('CURP', 'curp', { placeholder: 'MEGC850301HDFNRR09', required: false })
              : <div />
            }
          </div>

          {field(t('providers.clabe'), 'clabe', { placeholder: '18 dígitos' })}

          <div className="grid grid-cols-2 gap-3">
            {field('Email', 'email', { placeholder: 'contacto@empresa.mx' })}
            {field('Teléfono', 'phone', { placeholder: '55…', required: false })}
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#9ca3af' }}>{t('providers.specialty')} *</label>
            <select
              value={form.specialty}
              onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: '#1e2d3d', border: '1px solid #2a3f52', color: form.specialty ? '#e8f4f0' : '#6b7280' }}
            >
              <option value="">Selecciona…</option>
              {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {error && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>{error}</p>}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ background: '#1e2d3d', color: '#9ca3af', border: '1px solid #2a3f52' }}>
              {t('providers.form_cancel')}
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-xl text-sm font-bold" style={{ background: '#00e5c4', color: '#080c10', opacity: loading ? 0.6 : 1 }}>
              {loading ? '…' : t('providers.form_save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Upload document ───────────────────────────────────────────────────────────

const DOC_TYPES = ['CFDI_XML', 'CFDI_PDF', 'CONTRACT', 'PHOTO', 'ID_DOCUMENT'] as const;

function UploadDocModal({ provider, onClose, onUploaded }: { provider: Provider; onClose: () => void; onUploaded: (doc: ProviderDoc) => void }) {
  const t = useT();
  const [docType, setDocType] = useState<typeof DOC_TYPES[number]>('CFDI_XML');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setError('Select a file'); return; }
    setError('');
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', docType);
      const res = await fetch(`${API}/api/providers/${provider.id}/documents`, {
        method: 'POST',
        headers,
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Upload failed'); setLoading(false); return; }
      onUploaded(data.document);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="w-full max-w-md rounded-2xl p-6" style={{ background: '#0d1520', border: '1px solid #1e2d3d' }}>
        <h2 className="text-base font-bold mb-4" style={{ color: '#e8f4f0' }}>{t('providers.upload_doc')} — {provider.name}</h2>
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#9ca3af' }}>{t('providers.doc_type')} *</label>
            <select
              value={docType}
              onChange={e => setDocType(e.target.value as any)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: '#1e2d3d', border: '1px solid #2a3f52', color: '#e8f4f0' }}
            >
              {DOC_TYPES.map(dt => <option key={dt} value={dt}>{dt.replace('_', ' ')}</option>)}
            </select>
          </div>

          <div
            className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer"
            style={{ borderColor: file ? '#00e5c4' : '#2a3f52' }}
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={20} className="mx-auto mb-2" style={{ color: file ? '#00e5c4' : '#6b7280' }} />
            <p className="text-sm" style={{ color: file ? '#00e5c4' : '#6b7280' }}>
              {file ? file.name : t('providers.click_to_select')}
            </p>
            {file && <p className="text-xs mt-1" style={{ color: '#6b7280' }}>{(file.size / 1024).toFixed(1)} KB</p>}
            <input ref={fileRef} type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
          </div>

          {docType === 'CFDI_XML' && (
            <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(0,229,196,0.08)', color: '#00e5c4' }}>
              {t('providers.cfdi_xml_note')}
            </p>
          )}

          {error && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>{error}</p>}

          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ background: '#1e2d3d', color: '#9ca3af', border: '1px solid #2a3f52' }}>
              {t('providers.form_cancel')}
            </button>
            <button type="submit" disabled={loading || !file} className="flex-1 py-2.5 rounded-xl text-sm font-bold" style={{ background: '#00e5c4', color: '#080c10', opacity: (loading || !file) ? 0.5 : 1 }}>
              {loading ? '…' : t('providers.upload_submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Provider row ──────────────────────────────────────────────────────────────

function ProviderRow({ provider: initial, onStatusChange, currentUserId }: { provider: Provider; onStatusChange: (id: string, status: Provider['status']) => void; currentUserId: string | null }) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  const [provider, setProvider] = useState(initial);
  const [uploadModal, setUploadModal] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const isOwner = !!currentUserId && provider.userId === currentUserId;

  async function changeStatus(status: Provider['status']) {
    setLoading(status);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API}/api/providers/${provider.id}/status`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const data = await res.json();
        setProvider(data.provider);
        onStatusChange(provider.id, status);
      }
    } finally {
      setLoading(null);
    }
  }

  return (
    <>
      <div className="rounded-xl overflow-hidden" style={{ background: '#0d1520', border: '1px solid #1e2d3d' }}>
        {/* Row header */}
        <div
          className="flex items-center gap-4 p-4 cursor-pointer select-none"
          onClick={() => setExpanded(e => !e)}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm truncate" style={{ color: '#e8f4f0' }}>{provider.name}</span>
              <StatusBadge status={provider.status} />
              {isOwner && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(0,229,196,0.12)', color: '#00e5c4' }}>
                  {t('providers.my_profile')}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-xs font-mono" style={{ color: '#00e5c4' }}>{provider.rfc}</span>
              <span className="text-xs" style={{ color: '#6b7280' }}>{provider.specialty}</span>
              <EfosBadge status={provider.efosStatus} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#1e2d3d', color: '#6b7280' }}>
              <FileText size={10} className="inline mr-1" />{provider.documents?.length ?? provider.documentCount ?? 0} docs
            </span>
            {expanded ? <ChevronDown size={14} style={{ color: '#6b7280' }} /> : <ChevronRight size={14} style={{ color: '#6b7280' }} />}
          </div>
        </div>

        {/* Expanded details */}
        {expanded && (
          <div style={{ borderTop: '1px solid #1e2d3d' }}>
            {/* Info grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4">
              {[
                ['CLABE', provider.clabe],
                ['Email', provider.email],
                [t('providers.phone'), provider.phone || '—'],
                [t('providers.tipo'), provider.tipoPersona === 'moral' ? t('providers.tipo_moral') : t('providers.tipo_fisica')],
                ...(provider.curp ? [['CURP', provider.curp]] : []),
              ].map(([label, value]) => (
                <div key={label as string}>
                  <p className="text-xs mb-0.5" style={{ color: '#6b7280' }}>{label}</p>
                  <p className="text-xs font-mono" style={{ color: '#e8f4f0' }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Documents */}
            <div className="px-4 pb-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#6b7280' }}>{t('providers.docs')}</p>
                {isOwner && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setUploadModal(true); }}
                    className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg"
                    style={{ background: 'rgba(0,229,196,0.1)', color: '#00e5c4', border: '1px solid rgba(0,229,196,0.2)' }}
                  >
                    <Upload size={10} /> {t('providers.upload_doc')}
                  </button>
                )}
              </div>

              {provider.documents && provider.documents.length > 0 ? (
                <div className="space-y-2">
                  {provider.documents.map(doc => (
                    <div key={doc.id} className="rounded-lg p-3" style={{ background: '#1e2d3d' }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText size={12} style={{ color: '#00e5c4' }} />
                          <span className="text-xs font-medium truncate max-w-[200px]" style={{ color: '#e8f4f0' }}>{doc.filename}</span>
                        </div>
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#0d1520', color: '#6b7280' }}>{doc.type}</span>
                      </div>
                      {doc.cfdiData && (
                        <div className="mt-2 grid grid-cols-3 gap-2">
                          <div>
                            <p className="text-xs" style={{ color: '#6b7280' }}>{t('providers.cfdi_uuid')}</p>
                            <p className="text-xs font-mono truncate" style={{ color: '#00e5c4' }}>{doc.cfdiData.uuid.slice(0, 8)}…</p>
                          </div>
                          <div>
                            <p className="text-xs" style={{ color: '#6b7280' }}>{t('providers.cfdi_emisor')}</p>
                            <p className="text-xs font-mono" style={{ color: '#e8f4f0' }}>{doc.cfdiData.emisorRfc}</p>
                          </div>
                          <div>
                            <p className="text-xs" style={{ color: '#6b7280' }}>{t('providers.cfdi_total')}</p>
                            <p className="text-xs font-semibold" style={{ color: '#e8f4f0' }}>${doc.cfdiData.total.toLocaleString('es-MX')}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs" style={{ color: '#6b7280' }}>{t('providers.no_docs')}</p>
              )}
            </div>

            {/* Services */}
            <div className="px-4 pb-4">
              <div className="flex items-center gap-2 mb-3">
                <Wrench size={12} style={{ color: '#6b7280' }} />
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#6b7280' }}>{t('providers.services')}</p>
              </div>
              {provider.services && provider.services.length > 0 ? (
                <div className="space-y-2">
                  {provider.services.map(svc => (
                    <div key={svc.id} className="rounded-lg p-3" style={{ background: '#1e2d3d' }}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold" style={{ color: '#e8f4f0' }}>{svc.name}</p>
                        {svc.priceRange && (
                          <span className="text-xs font-mono shrink-0" style={{ color: '#00e5c4' }}>{svc.priceRange}</span>
                        )}
                      </div>
                      <p className="text-xs mt-1" style={{ color: '#6b7280' }}>{svc.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs" style={{ color: '#6b7280' }}>{t('providers.services_empty')}</p>
              )}
            </div>

            {/* Status actions */}
            {provider.status !== 'VERIFIED' && (
              <div className="flex gap-2 px-4 pb-4">
                <button
                  onClick={() => changeStatus('VERIFIED')}
                  disabled={loading === 'VERIFIED'}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium"
                  style={{ background: 'rgba(0,229,196,0.12)', color: '#00e5c4', border: '1px solid rgba(0,229,196,0.2)', opacity: loading === 'VERIFIED' ? 0.6 : 1 }}
                >
                  <ShieldCheck size={11} /> {loading === 'VERIFIED' ? '…' : t('providers.verify')}
                </button>
                {provider.status !== 'REJECTED' && (
                  <button
                    onClick={() => changeStatus('REJECTED')}
                    disabled={loading === 'REJECTED'}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium"
                    style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', opacity: loading === 'REJECTED' ? 0.6 : 1 }}
                  >
                    <XCircle size={11} /> {loading === 'REJECTED' ? '…' : t('providers.reject')}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {uploadModal && (
        <UploadDocModal
          provider={provider}
          onClose={() => setUploadModal(false)}
          onUploaded={(doc) => {
            setProvider(p => ({ ...p, documents: [...(p.documents || []), doc] }));
            setUploadModal(false);
          }}
        />
      )}
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Providers() {
  const t = useT();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addModal, setAddModal] = useState(false);
  const [filter, setFilter] = useState<'ALL' | Provider['status']>('ALL');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    loadProviders();
    getSession().then(({ data: { session } }) => setCurrentUserId(session?.user?.id ?? null));
  }, []);

  async function loadProviders() {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API}/api/providers`, { headers });
      if (!res.ok) throw new Error('Failed to load providers');
      const data = await res.json();
      setProviders(data.providers);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  }

  const filtered = filter === 'ALL' ? providers : providers.filter(p => p.status === filter);
  const counts = {
    ALL: providers.length,
    VERIFIED: providers.filter(p => p.status === 'VERIFIED').length,
    PENDING: providers.filter(p => p.status === 'PENDING').length,
    REJECTED: providers.filter(p => p.status === 'REJECTED').length,
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8" style={{ background: '#080c10', minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: '#e8f4f0' }}>{t('providers.title')}</h1>
          <p className="text-sm" style={{ color: '#6b7280' }}>{t('providers.subtitle')}</p>
        </div>
        <button
          onClick={() => setAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold"
          style={{ background: '#00e5c4', color: '#080c10' }}
        >
          <Plus size={14} /> {t('providers.add')}
        </button>
      </div>

      {/* Legal note */}
      <div className="flex items-start gap-3 p-4 rounded-xl mb-6" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
        <AlertTriangle size={14} className="mt-0.5 shrink-0" style={{ color: '#f59e0b' }} />
        <p className="text-xs leading-relaxed" style={{ color: '#d97706' }}>
          {t('providers.cfdi_warning')}
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-6">
        {(['ALL', 'VERIFIED', 'PENDING', 'REJECTED'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{
              background: filter === f ? 'rgba(0,229,196,0.12)' : '#1e2d3d',
              color: filter === f ? '#00e5c4' : '#6b7280',
              border: filter === f ? '1px solid rgba(0,229,196,0.2)' : '1px solid transparent',
            }}
          >
            {f === 'ALL' ? t('providers.filter_all') : f} <span style={{ opacity: 0.6 }}>({counts[f]})</span>
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-16">
          <p className="text-sm" style={{ color: '#6b7280' }}>{t('providers.loading')}</p>
        </div>
      ) : error ? (
        <div className="text-center py-16">
          <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm" style={{ color: '#6b7280' }}>{t('providers.empty')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(p => (
            <ProviderRow
              key={p.id}
              provider={p}
              currentUserId={currentUserId}
              onStatusChange={(id, status) => setProviders(ps => ps.map(pr => pr.id === id ? { ...pr, status } : pr))}
            />
          ))}
        </div>
      )}

      {addModal && (
        <AddProviderModal
          onClose={() => setAddModal(false)}
          onCreated={(p) => { setProviders(ps => [p, ...ps]); setAddModal(false); }}
        />
      )}
    </div>
  );
}
