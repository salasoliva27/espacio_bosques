/**
 * CompleteProfile — shown to Google OAuth users after first sign-in.
 * Collects RFC (and full name if not already provided by Google).
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/auth';
import { validateRfc, formatRfc } from '../lib/rfc';
import { useLanguage } from '../context/LanguageContext';
import type { User } from '@supabase/supabase-js';

interface CompleteProfileProps {
  user: User;
}

export default function CompleteProfile({ user }: CompleteProfileProps) {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const es = lang === 'es';

  const googleName = user.user_metadata?.full_name as string | undefined;
  const [fullName, setFullName] = useState(googleName ?? '');
  const [rfc, setRfc] = useState('');
  const [rfcError, setRfcError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

    const rfcResult = validateRfc(rfc, fullName);
    if (!rfcResult.valid) {
      setRfcError(rfcResult.error ?? 'RFC inválido');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          full_name: fullName.trim(),
          rfc: formatRfc(rfc),
          profile_complete: true,
        },
      });

      if (updateError) throw updateError;

      // Navigate to app root — session is already active
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || (es ? 'Error al guardar el perfil.' : 'Error saving profile.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: '#080c10' }}>
      <div className="w-full max-w-sm">
        <div className="rounded-2xl p-8" style={{ background: '#0d1520', border: '1px solid #1e2d3d' }}>
          <div className="text-center mb-8">
            <div className="text-2xl font-bold mb-1" style={{ color: '#00e5c4' }}>Espacio Bosques</div>
            <div className="text-sm font-medium mb-1" style={{ color: '#e8f4f0' }}>
              {es ? 'Un paso más' : 'One more step'}
            </div>
            <div className="text-xs" style={{ color: '#6b7280' }}>
              {es
                ? 'Para verificar tu identidad como residente, necesitamos tu RFC.'
                : 'To verify your identity as a resident, we need your RFC.'}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full name — pre-filled from Google, editable */}
            <div>
              <label className="block text-xs mb-1.5 font-medium" style={{ color: '#9ca3af' }}>
                {es ? 'Nombre completo' : 'Full name'}
              </label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
                placeholder={es ? 'Nombre Apellido-Paterno Apellido-Materno' : 'First Paternal Maternal'}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={{ background: '#080c10', border: '1px solid #1e2d3d', color: '#e8f4f0' }}
              />
              {googleName && (
                <p className="text-xs mt-1" style={{ color: '#4b5563' }}>
                  {es ? 'Tomado de tu cuenta de Google. Edita si el orden no es correcto.' : 'From your Google account. Edit if the order is wrong.'}
                </p>
              )}
            </div>

            {/* RFC */}
            <div>
              <label className="block text-xs mb-1.5 font-medium" style={{ color: '#9ca3af' }}>RFC</label>
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
              <div className="mt-1">
                {rfcError ? (
                  <p className="text-xs" style={{ color: '#ef4444' }}>{rfcError}</p>
                ) : rfc.length === 13 ? (
                  <p className="text-xs" style={{ color: '#00e5c4' }}>✓ {es ? 'Formato válido' : 'Valid format'}</p>
                ) : (
                  <p className="text-xs" style={{ color: '#4b5563' }}>
                    {es ? '13 caracteres, ej. SAOA850312H45' : '13 characters, e.g. SAOA850312H45'}
                  </p>
                )}
              </div>
            </div>

            {error && (
              <p className="text-xs py-2 px-3 rounded-lg" style={{ background: '#2d0a0a', color: '#f87171' }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !!rfcError}
              className="w-full py-2.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: '#00e5c4', color: '#080c10' }}
            >
              {loading ? (es ? 'Guardando…' : 'Saving…') : (es ? 'Completar registro' : 'Complete registration')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
