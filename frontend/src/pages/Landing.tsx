import { Suspense, lazy, Component, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ShieldCheck, BarChart3, ArrowRight, MapPin, ChevronDown } from 'lucide-react';
import { useT } from '../context/LanguageContext';

// ── Spline scenes ─────────────────────────────────────────────────────────────
// To use your own scenes:
//   1. Open your scene in Spline editor
//   2. Share → Export → "splinecode" → copy the URL
//   3. Replace the constants below
//
// SPLINE_HERO   → hero section right panel (desktop split layout)
// SPLINE_ACCENT → full-width band between stats and "how it works"
//
const SPLINE_HERO   = import.meta.env.VITE_SPLINE_HERO   || '';
const SPLINE_ACCENT = import.meta.env.VITE_SPLINE_ACCENT || '';

const Spline = lazy(() => import('@splinetool/react-spline'));

// ── Simple error boundary so a failed Spline load doesn't crash the page ─────
class SplineBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? (this.props.fallback ?? null) : this.props.children;
  }
}

// ── Curated Unsplash photos — all free, no attribution required ────────────
const PHOTOS = {
  hero:         'https://images.unsplash.com/photo-1518105779142-d975f22f1b0a?auto=format&fit=crop&w=1920&q=80',
  blueprint:    'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=900&q=75',
  community:    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=900&q=75',
  transparency: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=900&q=75',
};

const STAT_VALUES = ['2', '47', '$1.2M', '6'];
const STAT_KEYS = [
  'landing.stat1_label',
  'landing.stat2_label',
  'landing.stat3_label',
  'landing.stat4_label',
] as const;

const STEP_NUMBERS = ['01', '02', '03'];
const STEP_TITLE_KEYS = ['landing.step1_title', 'landing.step2_title', 'landing.step3_title'] as const;
const STEP_DESC_KEYS  = ['landing.step1_desc',  'landing.step2_desc',  'landing.step3_desc']  as const;

/** Spline canvas with spinner fallback + error boundary. Renders nothing if url is empty. */
function SplineScene({ url, className = '', style }: { url: string; className?: string; style?: React.CSSProperties }) {
  if (!url) return null;
  return (
    <SplineBoundary>
      <Suspense fallback={
        <div className="w-full h-full flex items-center justify-center">
          <div
            className="w-8 h-8 rounded-full border-2 animate-spin"
            style={{ borderColor: 'rgba(0,229,196,0.3)', borderTopColor: '#00e5c4' }}
          />
        </div>
      }>
        <Spline scene={url} className={className} style={{ width: '100%', height: '100%', ...style }} />
      </Suspense>
    </SplineBoundary>
  );
}

export default function Landing() {
  const t = useT();
  const hasHeroScene   = Boolean(SPLINE_HERO);
  const hasAccentScene = Boolean(SPLINE_ACCENT);

  const features = [
    { photo: PHOTOS.blueprint,    icon: Sparkles,   titleKey: 'landing.feat1_title' as const, descKey: 'landing.feat1_desc' as const },
    { photo: PHOTOS.community,    icon: ShieldCheck, titleKey: 'landing.feat2_title' as const, descKey: 'landing.feat2_desc' as const },
    { photo: PHOTOS.transparency, icon: BarChart3,   titleKey: 'landing.feat3_title' as const, descKey: 'landing.feat3_desc' as const },
  ];

  return (
    <div style={{ background: '#080c10' }}>

      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen overflow-hidden flex items-center">

        {/* Background: Spline scene (right side) or photo fallback */}
        {hasHeroScene ? (
          <>
            {/* Dark base */}
            <div className="absolute inset-0" style={{ background: '#080c10' }} />
            {/* Teal radial glow */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse 60% 60% at 70% 50%, rgba(0,229,196,0.07) 0%, transparent 70%)' }}
            />
            {/* Spline canvas — right 55% on desktop, full bleed on mobile */}
            <div
              className="absolute inset-y-0 right-0 w-full lg:w-[55%] pointer-events-none"
              aria-hidden="true"
            >
              <SplineScene url={SPLINE_HERO} />
            </div>
            {/* Text fade gradient (desktop) */}
            <div
              className="absolute inset-0 pointer-events-none hidden lg:block"
              style={{ background: 'linear-gradient(to right, #080c10 38%, rgba(8,12,16,0.85) 55%, transparent 75%)' }}
            />
            {/* Mobile overlay */}
            <div
              className="absolute inset-0 pointer-events-none lg:hidden"
              style={{ background: 'rgba(8,12,16,0.72)' }}
            />
          </>
        ) : (
          <>
            {/* Photo fallback when no Spline scene configured */}
            <img
              src={PHOTOS.hero}
              alt="Bosques de las Lomas, Ciudad de México"
              className="absolute inset-0 w-full h-full object-cover"
              style={{ objectPosition: 'center 40%' }}
            />
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(to bottom, rgba(8,12,16,0.75) 0%, rgba(8,12,16,0.45) 40%, rgba(8,12,16,0.80) 80%, #080c10 100%)' }}
            />
          </>
        )}

        {/* Content */}
        <div className={`relative z-10 px-6 sm:px-10 pt-24 pb-16 ${hasHeroScene ? 'lg:px-16 max-w-2xl' : 'text-center max-w-4xl mx-auto'}`}>
          {/* Location badge */}
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-8 backdrop-blur-sm`}
            style={{ background: 'rgba(0,229,196,0.12)', color: '#00e5c4', border: '1px solid rgba(0,229,196,0.25)' }}
          >
            <MapPin size={11} />
            {t('landing.location')}
          </div>

          <h1
            className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6"
            style={{ color: '#f0faf8', lineHeight: 1.05, textShadow: '0 2px 40px rgba(0,0,0,0.6)' }}
          >
            {t('landing.hero_line1')}<br />
            <span style={{ color: '#00e5c4' }}>{t('landing.hero_line2')}</span>
          </h1>

          <p
            className={`text-base sm:text-lg mb-10 leading-relaxed ${hasHeroScene ? 'max-w-lg' : 'max-w-xl mx-auto'}`}
            style={{ color: 'rgba(232,244,240,0.75)', textShadow: '0 1px 8px rgba(0,0,0,0.5)' }}
          >
            {t('landing.hero_sub')}
          </p>

          <div className={`flex flex-wrap gap-3 ${hasHeroScene ? '' : 'justify-center'}`}>
            <Link
              to="/dashboard"
              className="flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] hover:shadow-lg"
              style={{ background: '#00e5c4', color: '#080c10', boxShadow: '0 0 24px rgba(0,229,196,0.3)' }}
            >
              {t('landing.explore')} <ArrowRight size={15} />
            </Link>
            <Link
              to="/create"
              className="flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-bold transition-all hover:bg-white/10 backdrop-blur-sm"
              style={{ background: 'rgba(255,255,255,0.08)', color: '#e8f4f0', border: '1px solid rgba(255,255,255,0.15)' }}
            >
              <Sparkles size={14} /> {t('landing.pitch')}
            </Link>
          </div>
        </div>

        {/* Scroll hint */}
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-40"
          style={{ color: '#e8f4f0' }}
        >
          <span className="text-xs tracking-widest uppercase">{t('landing.scroll_hint')}</span>
          <ChevronDown size={16} className="animate-bounce" />
        </div>
      </section>

      {/* ── STATS BAR ─────────────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid #1e2d3d', borderBottom: '1px solid #1e2d3d', background: '#0a0f17' }}>
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-2 sm:grid-cols-4">
            {STAT_VALUES.map((value, i) => (
              <div
                key={STAT_KEYS[i]}
                className="flex flex-col items-center justify-center py-6 px-4"
                style={{ borderRight: i < 3 ? '1px solid #1e2d3d' : undefined }}
              >
                <span className="text-2xl font-extrabold tracking-tight" style={{ color: '#00e5c4' }}>{value}</span>
                <span className="text-xs mt-1" style={{ color: '#6b7280' }}>{t(STAT_KEYS[i])}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── SPLINE ACCENT BAND — only rendered when scene is configured ── */}
      {hasAccentScene && (
        <section
          className="relative overflow-hidden"
          style={{ height: 380, background: 'linear-gradient(to bottom, #0a0f17, #080c10)' }}
          aria-label="3D visualization"
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 50% 80% at 50% 50%, rgba(0,229,196,0.05) 0%, transparent 70%)' }}
          />
          <div className="absolute inset-0">
            <SplineScene url={SPLINE_ACCENT} />
          </div>
          {/* Fade edges */}
          <div
            className="absolute inset-x-0 top-0 h-20 pointer-events-none"
            style={{ background: 'linear-gradient(to bottom, #0a0f17, transparent)' }}
          />
          <div
            className="absolute inset-x-0 bottom-0 h-20 pointer-events-none"
            style={{ background: 'linear-gradient(to top, #080c10, transparent)' }}
          />
          {/* Centered label */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: 'rgba(0,229,196,0.5)' }}>
                {t('landing.section_tech')}
              </p>
              <h2 className="text-xl font-bold" style={{ color: 'rgba(232,244,240,0.6)' }}>
                {t('landing.built_for')}
              </h2>
            </div>
          </div>
        </section>
      )}

      {/* ── HOW IT WORKS ──────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-20">
        <div className="mb-12">
          <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: '#00e5c4' }}>{t('landing.section_process')}</p>
          <h2 className="text-2xl sm:text-3xl font-bold" style={{ color: '#e8f4f0' }}>{t('landing.how_title')}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {STEP_NUMBERS.map((n, i) => (
            <div key={n}>
              <div className="text-5xl font-black mb-4 leading-none" style={{ color: 'rgba(0,229,196,0.15)', letterSpacing: '-0.04em' }}>{n}</div>
              <h3 className="text-base font-semibold mb-2" style={{ color: '#e8f4f0' }}>{t(STEP_TITLE_KEYS[i])}</h3>
              <p className="text-sm leading-relaxed" style={{ color: '#6b7280' }}>{t(STEP_DESC_KEYS[i])}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES — photo cards ─────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-20">
        {!hasAccentScene && (
          <div className="mb-12">
            <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: '#00e5c4' }}>{t('landing.section_tech')}</p>
            <h2 className="text-2xl sm:text-3xl font-bold" style={{ color: '#e8f4f0' }}>{t('landing.built_for')}</h2>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {features.map(({ photo, icon: Icon, titleKey, descKey }) => (
            <div
              key={titleKey}
              className="rounded-2xl overflow-hidden flex flex-col"
              style={{ background: '#0d1520', border: '1px solid #1e2d3d' }}
            >
              <div className="relative h-44 overflow-hidden">
                <img
                  src={photo} alt={t(titleKey)}
                  className="absolute inset-0 w-full h-full object-cover" loading="lazy"
                  style={{ transition: 'transform 0.4s ease' }}
                  onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.04)')}
                  onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(13,21,32,0.95) 0%, rgba(13,21,32,0.3) 60%, transparent 100%)' }} />
                <div className="absolute bottom-0 left-0 p-4">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,229,196,0.15)', backdropFilter: 'blur(8px)' }}>
                    <Icon size={16} style={{ color: '#00e5c4' }} />
                  </div>
                </div>
              </div>
              <div className="p-5 flex-1">
                <h3 className="font-semibold mb-2" style={{ color: '#e8f4f0' }}>{t(titleKey)}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#6b7280' }}>{t(descKey)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-24">
        <div
          className="rounded-2xl px-8 py-14 text-center relative overflow-hidden"
          style={{ background: '#0d1520', border: '1px solid #1e2d3d' }}
        >
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 -translate-y-1/2 rounded-full blur-3xl pointer-events-none"
            style={{ background: 'rgba(0,229,196,0.06)' }}
          />
          <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: '#00e5c4' }}>Bosques de las Lomas</p>
          <h2 className="text-2xl sm:text-3xl font-bold mb-3" style={{ color: '#e8f4f0' }}>{t('landing.cta_title')}</h2>
          <p className="text-sm mb-8 max-w-sm mx-auto" style={{ color: '#6b7280' }}>{t('landing.cta_sub')}</p>
          <Link
            to="/create"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-bold transition-all hover:scale-[1.02]"
            style={{ background: '#00e5c4', color: '#080c10', boxShadow: '0 0 20px rgba(0,229,196,0.25)' }}
          >
            <Sparkles size={14} /> {t('landing.cta_btn')}
          </Link>
        </div>
      </section>

    </div>
  );
}
