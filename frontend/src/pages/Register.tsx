import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/auth';
import { validateRfc, formatRfc } from '../lib/rfc';
import { useLanguage } from '../context/LanguageContext';

export default function Register() {
  const { lang, toggle } = useLanguage();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rfc, setRfc] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rfcError, setRfcError] = useState('');

  const handleRfcChange = (val: string) => {
    const formatted = formatRfc(val);
    setRfc(formatted);
    if (formatted.length >= 13) {
      const result = validateRfc(formatted, fullName);
      setRfcError(result.valid ? '' : (result.error ?? ''));
    } else {
      setRfcError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setRfcError('');

    // Validate RFC before submitting
    const rfcResult = validateRfc(rfc, fullName);
    if (!rfcResult.valid) {
      setRfcError(rfcResult.error ?? 'RFC inválido');
      return;
    }

    if (password.length < 6) {
      setError(lang === 'es' ? 'La contraseña debe tener al menos 6 caracteres.' : 'Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            rfc: formatRfc(rfc),
          },
        },
      });

      if (signUpError) throw signUpError;

      // Redirect to login with success message
      navigate('/auth?registered=1');
    } catch (err: any) {
      setError(err.message || (lang === 'es' ? 'Error al crear la cuenta.' : 'Error creating account.'));
    } finally {
      setLoading(false);
    }
  };

  const es = lang === 'es';

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: '#080c10' }}>
      <div className="w-full max-w-sm">
        {/* Card */}
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
              {es ? 'Crea tu cuenta' : 'Create your account'}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs mb-1.5 font-medium" style={{ color: '#9ca3af' }}>
                {es ? 'Nombre completo' : 'Full name'}
              </label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
                placeholder={es ? 'Nombre Apellido-Paterno Apellido-Materno' : 'First name Paternal Maternal'}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={{ background: '#080c10', border: '1px solid #1e2d3d', color: '#e8f4f0' }}
              />
              <p className="text-xs mt-1" style={{ color: '#4b5563' }}>
                {es
                  ? 'Ingresa en orden: Nombre(s) Apellido-Paterno Apellido-Materno'
                  : 'Enter in order: First-name Paternal-surname Maternal-surname'}
              </p>
            </div>

            {/* Email */}
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

            {/* Password */}
            <div>
              <label className="block text-xs mb-1.5 font-medium" style={{ color: '#9ca3af' }}>
                {es ? 'Contraseña (mín. 6 caracteres)' : 'Password (min. 6 characters)'}
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="••••••"
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={{ background: '#080c10', border: '1px solid #1e2d3d', color: '#e8f4f0' }}
              />
            </div>

            {/* RFC */}
            <div>
              <label className="block text-xs mb-1.5 font-medium" style={{ color: '#9ca3af' }}>
                RFC
              </label>
              <input
                type="text"
                value={rfc}
                onChange={e => handleRfcChange(e.target.value)}
                required
                maxLength={13}
                placeholder="SAOA850312H45"
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none font-mono tracking-widest"
                style={{
                  background: '#080c10',
                  border: `1px solid ${rfcError ? '#ef4444' : rfc.length === 13 && !rfcError ? '#00e5c4' : '#1e2d3d'}`,
                  color: '#e8f4f0',
                }}
              />
              {/* RFC status line */}
              <div className="mt-1">
                {rfcError ? (
                  <p className="text-xs" style={{ color: '#ef4444' }}>{rfcError}</p>
                ) : rfc.length === 13 ? (
                  <p className="text-xs" style={{ color: '#00e5c4' }}>
                    {es ? '✓ Formato válido' : '✓ Valid format'}
                  </p>
                ) : (
                  <p className="text-xs" style={{ color: '#4b5563' }}>
                    {es
                      ? '13 caracteres — ej. SAOA850312H45 (persona física)'
                      : '13 characters — e.g. SAOA850312H45 (individual)'}
                  </p>
                )}
              </div>
              <p className="text-xs mt-1" style={{ color: '#374151' }}>
                {es
                  ? 'Validación estructural basada en tu nombre. La verificación contra el SAT requiere autorización.'
                  : 'Structural validation against your name. SAT database verification requires authorization.'}
              </p>
            </div>

            {/* Global error */}
            {error && (
              <p className="text-xs py-2 px-3 rounded-lg" style={{ background: '#2d0a0a', color: '#f87171' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !!rfcError}
              className="w-full py-2.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 mt-2"
              style={{ background: '#00e5c4', color: '#080c10' }}
            >
              {loading
                ? (es ? 'Creando cuenta…' : 'Creating account…')
                : (es ? 'Crear cuenta' : 'Create account')}
            </button>
          </form>

          <div className="mt-5 text-center">
            <Link to="/auth" className="text-xs transition-opacity hover:opacity-80" style={{ color: '#00e5c4' }}>
              {es ? '¿Ya tienes cuenta? Inicia sesión' : 'Already have an account? Sign in'}
            </Link>
          </div>
        </div>

        {/* Info box */}
        <div className="mt-4 rounded-xl p-4" style={{ background: '#0a1520', border: '1px solid #1e2d3d' }}>
          <p className="text-xs leading-relaxed" style={{ color: '#4b5563' }}>
            {es
              ? 'Tu RFC se valida estructuralmente contra tu nombre. Esto confirma que el RFC pertenece a la persona que se está registrando. Para validación completa contra el SAT, se requiere integración adicional.'
              : 'Your RFC is structurally validated against your name. This confirms the RFC belongs to the registering person. Full SAT database validation requires additional integration.'}
          </p>
        </div>
      </div>
    </div>
  );
}
