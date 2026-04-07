import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/auth';
import { validateRfc, formatRfc, extractBirthDate, formatBirthDate } from '../lib/rfc';
import { useLanguage } from '../context/LanguageContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

type BlacklistStatus = 'idle' | 'checking' | 'clean' | 'presunto' | 'definitivo' | 'service_unavailable';

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
  const [blacklistStatus, setBlacklistStatus] = useState<BlacklistStatus>('idle');
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const rfcDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkRfc = async (rfcVal: string) => {
    setBlacklistStatus('checking');
    try {
      const res = await fetch(`${API_URL}/api/rfc/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rfc: rfcVal }),
      });
      const data = await res.json();
      if (data.birthDate) {
        setBirthDate(new Date(data.birthDate + 'T12:00:00'));
      }
      const bl = data.blacklist?.status ?? 'service_unavailable';
      setBlacklistStatus(bl as BlacklistStatus);
    } catch {
      setBlacklistStatus('service_unavailable');
    }
  };

  const handleRfcChange = (val: string) => {
    const formatted = formatRfc(val);
    setRfc(formatted);
    setBlacklistStatus('idle');
    setBirthDate(null);

    if (formatted.length >= 13) {
      const result = validateRfc(formatted, fullName);
      setRfcError(result.valid ? '' : (result.error ?? ''));
      if (result.valid) {
        const bd = extractBirthDate(formatted);
        setBirthDate(bd);
        if (rfcDebounceRef.current) clearTimeout(rfcDebounceRef.current);
        rfcDebounceRef.current = setTimeout(() => checkRfc(formatted), 600);
      }
    } else {
      setRfcError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setRfcError('');

    // Structural RFC validation
    const rfcResult = validateRfc(rfc, fullName);
    if (!rfcResult.valid) {
      setRfcError(rfcResult.error ?? 'RFC inválido');
      return;
    }

    // Block if RFC is on SAT's confirmed fraud list
    if (blacklistStatus === 'definitivo') {
      setRfcError(lang === 'es'
        ? 'Este RFC aparece en el listado definitivo del SAT (Art. 69-B). No es posible registrarse.'
        : 'This RFC appears on the SAT confirmed fraud list (Art. 69-B). Registration is not allowed.');
      return;
    }

    // If blacklist check is still in progress, wait
    if (blacklistStatus === 'checking') {
      setError(lang === 'es' ? 'Verificando RFC, un momento…' : 'Verifying RFC, please wait…');
      return;
    }

    if (password.length < 6) {
      setError(lang === 'es' ? 'La contraseña debe tener al menos 6 caracteres.' : 'Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const metadata: Record<string, any> = {
        full_name: fullName.trim(),
        rfc: formatRfc(rfc),
        rfc_verified: blacklistStatus === 'clean',
        rfc_status: blacklistStatus, // 'clean' | 'presunto' | 'service_unavailable'
      };
      // Store extracted birth date if available
      if (birthDate) {
        const iso = birthDate.toISOString().slice(0, 10);
        metadata.birth_date = iso;
      }

      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: metadata },
      });

      if (signUpError) throw signUpError;

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
              <div className="mt-1.5 space-y-1">
                {rfcError ? (
                  <p className="text-xs" style={{ color: '#ef4444' }}>{rfcError}</p>
                ) : rfc.length === 13 && !rfcError ? (
                  <>
                    {/* Birth date extracted from RFC */}
                    {birthDate && (
                      <p className="text-xs" style={{ color: '#6b7280' }}>
                        {es
                          ? `RFC detecta fecha de nacimiento: ${formatBirthDate(birthDate, 'es')}`
                          : `RFC encodes birth date: ${formatBirthDate(birthDate, 'en')}`}
                      </p>
                    )}
                    {/* SAT 69-B blacklist check status */}
                    {blacklistStatus === 'checking' && (
                      <p className="text-xs" style={{ color: '#6b7280' }}>
                        {es ? '⏳ Verificando lista SAT 69-B…' : '⏳ Checking SAT 69-B list…'}
                      </p>
                    )}
                    {blacklistStatus === 'clean' && (
                      <p className="text-xs font-medium" style={{ color: '#00e5c4' }}>
                        {es ? '✓ RFC verificado — no aparece en listas SAT' : '✓ RFC verified — not on SAT lists'}
                      </p>
                    )}
                    {blacklistStatus === 'presunto' && (
                      <p className="text-xs" style={{ color: '#f59e0b' }}>
                        {es
                          ? '⚠ Este RFC aparece como presunto en Art. 69-B SAT. Puedes continuar pero será revisado.'
                          : '⚠ This RFC appears as presumed on SAT Art. 69-B. You may continue but it will be reviewed.'}
                      </p>
                    )}
                    {blacklistStatus === 'definitivo' && (
                      <p className="text-xs" style={{ color: '#ef4444' }}>
                        {es ? '✗ RFC en listado definitivo SAT 69-B — registro no permitido' : '✗ RFC on SAT 69-B confirmed list — registration not allowed'}
                      </p>
                    )}
                    {blacklistStatus === 'service_unavailable' && (
                      <p className="text-xs" style={{ color: '#f59e0b' }}>
                        {es
                          ? '⚠ Lista SAT no disponible — validación estructural aplicada'
                          : '⚠ SAT list unavailable — structural validation applied'}
                      </p>
                    )}
                    {blacklistStatus === 'idle' && !rfcError && (
                      <p className="text-xs" style={{ color: '#00e5c4' }}>
                        {es ? '✓ Formato válido' : '✓ Valid format'}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-xs" style={{ color: '#4b5563' }}>
                    {es
                      ? '13 caracteres — ej. SAOA850312H45 (persona física)'
                      : '13 characters — e.g. SAOA850312H45 (individual)'}
                  </p>
                )}
              </div>
            </div>

            {/* Global error */}
            {error && (
              <p className="text-xs py-2 px-3 rounded-lg" style={{ background: '#2d0a0a', color: '#f87171' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !!rfcError || blacklistStatus === 'checking' || blacklistStatus === 'definitivo'}
              className="w-full py-2.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 mt-2"
              style={{ background: '#00e5c4', color: '#080c10' }}
            >
              {loading
                ? (es ? 'Creando cuenta…' : 'Creating account…')
                : blacklistStatus === 'checking'
                  ? (es ? 'Verificando…' : 'Verifying…')
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
              ? 'Tu RFC se valida estructuralmente y se verifica contra la lista pública SAT Art. 69-B (actualizada mensualmente).'
              : 'Your RFC is structurally validated and checked against the public SAT Art. 69-B list (updated monthly).'}
          </p>
        </div>
      </div>
    </div>
  );
}
