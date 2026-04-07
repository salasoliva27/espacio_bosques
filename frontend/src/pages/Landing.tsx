import { Link } from 'react-router-dom';
import { Sparkles, ShieldCheck, BarChart3, ArrowRight, MapPin } from 'lucide-react';
import { useT } from '../context/LanguageContext';

export default function Landing() {
  const t = useT();

  const features = [
    {
      icon: Sparkles,
      titleKey: 'landing.feat1_title' as const,
      descKey: 'landing.feat1_desc' as const,
    },
    {
      icon: ShieldCheck,
      titleKey: 'landing.feat2_title' as const,
      descKey: 'landing.feat2_desc' as const,
    },
    {
      icon: BarChart3,
      titleKey: 'landing.feat3_title' as const,
      descKey: 'landing.feat3_desc' as const,
    },
  ];

  return (
    <div className="min-h-screen" style={{ background: '#080c10' }}>
      {/* Hero */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-8" style={{ background: 'rgba(0,229,196,0.08)', color: '#00e5c4', border: '1px solid rgba(0,229,196,0.2)' }}>
          <MapPin size={11} />
          {t('landing.location')}
        </div>
        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight mb-6" style={{ color: '#e8f4f0', lineHeight: 1.1 }}>
          {t('landing.hero_line1')}<br />
          <span style={{ color: '#00e5c4' }}>{t('landing.hero_line2')}</span>
        </h1>
        <p className="max-w-xl mx-auto text-lg mb-10" style={{ color: '#6b7280' }}>
          {t('landing.hero_sub')}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ background: '#00e5c4', color: '#080c10' }}
          >
            {t('landing.explore')} <ArrowRight size={15} />
          </Link>
          <Link
            to="/create"
            className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-colors"
            style={{ background: '#0d1520', color: '#e8f4f0', border: '1px solid #1e2d3d' }}
          >
            <Sparkles size={14} /> {t('landing.pitch')}
          </Link>
        </div>
      </div>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div style={{ height: 1, background: '#1e2d3d' }} />
      </div>

      {/* Features */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {features.map(({ icon: Icon, titleKey, descKey }) => (
            <div key={titleKey} className="rounded-xl p-6" style={{ background: '#0d1520', border: '1px solid #1e2d3d' }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-4" style={{ background: 'rgba(0,229,196,0.1)' }}>
                <Icon size={18} style={{ color: '#00e5c4' }} />
              </div>
              <h3 className="font-semibold mb-2" style={{ color: '#e8f4f0' }}>{t(titleKey)}</h3>
              <p className="text-sm leading-relaxed" style={{ color: '#6b7280' }}>{t(descKey)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA bottom */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 text-center">
        <div className="rounded-2xl p-10" style={{ background: '#0d1520', border: '1px solid #1e2d3d' }}>
          <h2 className="text-2xl font-bold mb-3" style={{ color: '#e8f4f0' }}>{t('landing.cta_title')}</h2>
          <p className="text-sm mb-6" style={{ color: '#6b7280' }}>{t('landing.cta_sub')}</p>
          <Link
            to="/create"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ background: '#00e5c4', color: '#080c10' }}
          >
            <Sparkles size={14} /> {t('landing.cta_btn')}
          </Link>
        </div>
      </div>
    </div>
  );
}
