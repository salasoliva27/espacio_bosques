import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/auth';
import { useLanguage } from '../context/LanguageContext';

export default function AuthScreen() {
  const { lang, toggle } = useLanguage();
  const [searchParams] = useSearchParams();
  const justRegistered = searchParams.get('registered') === '1';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const es = lang === 'es';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      // App.tsx will detect session change via onAuthStateChange
    } catch (err: any) {
      setError(err.message || (es ? 'Error al iniciar sesión.' : 'Sign-in error.'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/auth/callback' },
    });
    if (oauthError) {
      const notConfigured =
        oauthError.message.toLowerCase().includes('not enabled') ||
        oauthError.message.toLowerCase().includes('unsupported provider');
      setError(
        notConfigured
          ? (es ? 'Google no está habilitado aún. Usa correo y contraseña.' : 'Google sign-in is not enabled yet. Use email and password.')
          : (oauthError.message || (es ? 'Error de autenticación.' : 'Authentication error.'))
      );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#080c10' }}>
      <div className="w-full max-w-sm">
        <div className="rounded-2xl p-8" style={{ background: '#0d1520', border: '1px solid #1e2d3d' }}>
          {/* Header */}
          <div className="text-center mb-8 relative">
            <button
              onClick={toggle}
              className="absolute right-0 top-0 text-xs font-semibold px-2 py-1 rounded-md border"
              style={{ borderColor: '#2a3f52', color: '#6b7280' }}
            >
              {lang === 'es' ? 'EN' : 'ES'}
            </button>
            <div className="text-2xl font-bold mb-1" style={{ color: '#00e5c4' }}>Espacio Bosques</div>
            <div className="text-sm" style={{ color: '#6b7280' }}>
              {es ? 'Inicia sesión' : 'Sign in'}
            </div>
          </div>

          {/* Success banner after registration */}
          {justRegistered && (
            <div className="mb-5 rounded-xl p-4 text-center" style={{ background: '#0a2d1a', border: '1px solid #1e5c30' }}>
              <div className="text-xl mb-1">📬</div>
              <p className="text-sm font-semibold mb-0.5" style={{ color: '#4ade80' }}>
                {es ? '¡Cuenta creada!' : 'Account created!'}
              </p>
              <p className="text-xs" style={{ color: '#6b7280' }}>
                {es
                  ? 'Revisa tu correo y confirma tu cuenta antes de iniciar sesión.'
                  : 'Check your email and confirm your account before signing in.'}
              </p>
            </div>
          )}

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
            {es ? 'Continuar con Google' : 'Continue with Google'}
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px" style={{ background: '#1e2d3d' }} />
            <span className="text-xs" style={{ color: '#6b7280' }}>o</span>
            <div className="flex-1 h-px" style={{ background: '#1e2d3d' }} />
          </div>

          {/* Email + Password */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs mb-1.5 font-medium" style={{ color: '#9ca3af' }}>
                {es ? 'Correo electrónico' : 'Email address'}
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="tu@correo.mx"
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={{ background: '#080c10', border: '1px solid #1e2d3d', color: '#e8f4f0' }}
              />
            </div>

            <div>
              <label className="block text-xs mb-1.5 font-medium" style={{ color: '#9ca3af' }}>
                {es ? 'Contraseña' : 'Password'}
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••"
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={{ background: '#080c10', border: '1px solid #1e2d3d', color: '#e8f4f0' }}
              />
            </div>

            {error && (
              <p className="text-xs py-2 px-3 rounded-lg" style={{ background: '#2d0a0a', color: '#f87171' }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: '#00e5c4', color: '#080c10' }}
            >
              {loading ? (es ? 'Entrando…' : 'Signing in…') : (es ? 'Iniciar sesión' : 'Sign in')}
            </button>
          </form>

          <div className="mt-5 text-center">
            <Link to="/register" className="text-xs transition-opacity hover:opacity-80" style={{ color: '#00e5c4' }}>
              {es ? '¿No tienes cuenta? Regístrate' : "Don't have an account? Register"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
