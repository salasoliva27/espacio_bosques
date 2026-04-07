import { useState } from 'react';
import { supabase } from '../lib/auth';
import { useLanguage, useT } from '../context/LanguageContext';

interface AuthScreenProps {
  onSuccess: () => void;
}

export default function AuthScreen({ onSuccess }: AuthScreenProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const { lang, toggle } = useLanguage();
  const t = useT();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name.trim() || email.split('@')[0] } },
        });
        if (signUpError) throw signUpError;
        setPendingEmail(email);
        setMessage(t('auth.confirm_email'));
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || t('auth.error_generic'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (oauthError) setError(oauthError.message);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#080c10' }}>
      <div className="w-full max-w-sm rounded-2xl p-8" style={{ background: '#0d1520', border: '1px solid #1e2d3d' }}>
        {/* Header with lang toggle */}
        <div className="text-center mb-8 relative">
          <button
            onClick={toggle}
            className="absolute right-0 top-0 text-xs font-semibold px-2 py-1 rounded-md border"
            style={{ borderColor: '#2a3f52', color: '#6b7280' }}
          >
            {lang === 'es' ? 'EN' : 'ES'}
          </button>
          <div className="text-2xl font-bold mb-1" style={{ color: '#00e5c4' }}>
            Espacio Bosques
          </div>
          <div className="text-sm" style={{ color: '#6b7280' }}>
            {mode === 'signin' ? t('auth.signin_subtitle') : t('auth.signup_subtitle')}
          </div>
        </div>

        {/* Google */}
        <button
          onClick={handleGoogle}
          className="w-full flex items-center justify-center gap-3 py-2.5 rounded-lg text-sm font-medium mb-4 transition-opacity hover:opacity-80"
          style={{ background: '#1e2d3d', color: '#e8f4f0', border: '1px solid #2a3f52' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {t('auth.google')}
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px" style={{ background: '#1e2d3d' }} />
          <span className="text-xs" style={{ color: '#6b7280' }}>o</span>
          <div className="flex-1 h-px" style={{ background: '#1e2d3d' }} />
        </div>

        {/* Email verification pending state */}
        {pendingEmail && (
          <div className="mb-4 rounded-xl p-5 text-center" style={{ background: '#0a2d1a', border: '1px solid #1e5c30' }}>
            <div className="text-2xl mb-2">📬</div>
            <p className="text-sm font-semibold mb-1" style={{ color: '#4ade80' }}>{t('auth.confirm_email')}</p>
            <p className="text-xs mb-3" style={{ color: '#6b7280' }}>{pendingEmail}</p>
            <button
              onClick={async () => {
                await supabase.auth.resend({ type: 'signup', email: pendingEmail });
              }}
              className="text-xs underline"
              style={{ color: '#00e5c4' }}
            >
              {t('auth.resend_email')}
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3" style={{ display: pendingEmail ? 'none' : undefined }}>
          {mode === 'signup' && (
            <div>
              <label className="block text-xs mb-1.5" style={{ color: '#9ca3af' }}>
                {t('auth.name')}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('auth.name_placeholder')}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none focus:ring-1"
                style={{ background: '#080c10', border: '1px solid #1e2d3d', color: '#e8f4f0', '--tw-ring-color': '#00e5c4' } as React.CSSProperties}
              />
            </div>
          )}
          <div>
            <label className="block text-xs mb-1.5" style={{ color: '#9ca3af' }}>
              {t('auth.email')}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="tu@correo.mx"
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none focus:ring-1"
              style={{ background: '#080c10', border: '1px solid #1e2d3d', color: '#e8f4f0', '--tw-ring-color': '#00e5c4' } as React.CSSProperties}
            />
          </div>

          <div>
            <label className="block text-xs mb-1.5" style={{ color: '#9ca3af' }}>
              {t('auth.password')}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="••••••"
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none focus:ring-1"
              style={{ background: '#080c10', border: '1px solid #1e2d3d', color: '#e8f4f0', '--tw-ring-color': '#00e5c4' } as React.CSSProperties}
            />
          </div>

          {error && (
            <p className="text-xs py-2 px-3 rounded-lg" style={{ background: '#2d0a0a', color: '#f87171' }}>{error}</p>
          )}
          {message && (
            <p className="text-xs py-2 px-3 rounded-lg" style={{ background: '#0a2d1a', color: '#4ade80' }}>{message}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: '#00e5c4', color: '#080c10' }}
          >
            {loading ? t('auth.processing') : mode === 'signin' ? t('auth.submit_signin') : t('auth.submit_signup')}
          </button>
        </form>

        {!pendingEmail && (
          <div className="mt-5 text-center">
            <button
              onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setMessage(''); setPendingEmail(''); setName(''); }}
              className="text-xs transition-opacity hover:opacity-80"
              style={{ color: '#00e5c4' }}
            >
              {mode === 'signin' ? t('auth.switch_signup') : t('auth.switch_signin')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
