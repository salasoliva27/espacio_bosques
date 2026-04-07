import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/auth';
import { validateRfc, formatRfc, extractBirthDate, formatBirthDate } from '../lib/rfc';
import { useLanguage } from '../context/LanguageContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

type SatStatus = 'idle' | 'checking' | 'found' | 'not_found' | 'service_unavailable';

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
  const [satStatus, setSatStatus] = useState<SatStatus>('idle');
  const [satMessage, setSatMessage] = useState('');
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const satDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkRfcWithSat = async (rfcVal: string) => {
    setSatStatus('checking');
    setSatMessage('');
    try {
      const res = await fetch(`${API_URL}/api/rfc/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rfc: rfcVal }),
      });
      const data = await res.json();
      if (data.birthDate) {
        const d = new Date(data.birthDate + 'T12:00:00'); // noon to avoid UTC offset issues
        setBirthDate(d);
      }
      if (data.status === 'found') {
        setSatStatus('found');
      } else if (data.status === 'not_found') {
        setSatStatus('not_found');
        setSatMessage(data.message || 'RFC no encontrado en el padrón del SAT');
      } else {
        // service_unavailable — degrade gracefully, don't block
        setSatStatus('service_unavailable');
        setSatMessage('');
      }
    } catch {
      setSatStatus('service_unavailable');
    }
  };

  const handleRfcChange = (val: string) => {
    const formatted = formatRfc(val);
    setRfc(formatted);
    setSatStatus('idle');
    setBirthDate(null);

    if (formatted.length >= 13) {
      const result = validateRfc(formatted, fullName);
      setRfcError(result.valid ? '' : (result.error ?? ''));
      if (result.valid) {
        // Extract birth date immediately (doesn't need SAT call)
        const bd = extractBirthDate(formatted);
        setBirthDate(bd);
        // Debounce the SAT check
        if (satDebounceRef.current) clearTimeout(satDebounceRef.current);
        satDebounceRef.current = setTimeout(() => checkRfcWithSat(formatted), 600);
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

    // Block if SAT says RFC doesn't exist
    if (satStatus === 'not_found') {
      setRfcError(lang === 'es'
        ? 'El RFC no está registrado en el padrón del SAT. Verifica que sea correcto.'
        : 'This RFC is not registered with SAT. Please verify it is correct.');
      return;
    }

    // If SAT check is still pending, wait for it
    if (satStatus === 'checking') {
      setError(lang === 'es' ? 'Verificando RFC con SAT, un momento…' : 'Verifying RFC with SAT, please wait…');
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
        rfc_verified: satStatus === 'found',
        rfc_status: satStatus, // 'found' | 'service_unavailable' (not_found is blocked above)
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
                    {/* SAT registry check status */}
                    {satStatus === 'checking' && (
                      <p className="text-xs" style={{ color: '#6b7280' }}>
                        {es ? '⏳ Verificando con el padrón del SAT…' : '⏳ Checking SAT registry…'}
                      </p>
                    )}
                    {satStatus === 'found' && (
                      <p className="text-xs font-medium" style={{ color: '#00e5c4' }}>
                        {es ? '✓ RFC registrado y activo en el SAT' : '✓ RFC registered and active with SAT'}
                      </p>
                    )}
                    {satStatus === 'not_found' && (
                      <p className="text-xs" style={{ color: '#ef4444' }}>
                        {es ? '✗ RFC no encontrado en el padrón del SAT' : '✗ RFC not found in SAT registry'}
                      </p>
                    )}
                    {satStatus === 'service_unavailable' && (
                      <p className="text-xs" style={{ color: '#f59e0b' }}>
                        {es
                          ? '⚠ Validación SAT no disponible — validación estructural aplicada'
                          : '⚠ SAT check unavailable — structural validation applied'}
                      </p>
                    )}
                    {satStatus === 'idle' && !rfcError && (
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
              disabled={loading || !!rfcError || satStatus === 'checking' || satStatus === 'not_found'}
              className="w-full py-2.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 mt-2"
              style={{ background: '#00e5c4', color: '#080c10' }}
            >
              {loading
                ? (es ? 'Creando cuenta…' : 'Creating account…')
                : satStatus === 'checking'
                  ? (es ? 'Verificando RFC…' : 'Verifying RFC…')
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
