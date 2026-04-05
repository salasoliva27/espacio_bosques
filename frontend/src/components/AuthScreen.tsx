import { useState } from 'react'
import { signInWithEmail, signUpWithEmail, signInWithGoogle } from '../lib/auth'

interface AuthScreenProps {
  onSuccess?: () => void
}

export default function AuthScreen({ onSuccess }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const isSimulation = import.meta.env.VITE_SIMULATION_MODE === 'true'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')
    if (pin.length < 6) { setError('El PIN debe tener al menos 6 caracteres.'); return }
    setLoading(true)
    try {
      const { error } = mode === 'login'
        ? await signInWithEmail(email, pin)
        : await signUpWithEmail(email, pin)
      if (error) {
        setError(error.message)
      } else {
        if (mode === 'signup') setMessage('Cuenta creada. Revisa tu correo para confirmar.')
        else onSuccess?.()
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setError('')
    await signInWithGoogle()
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#080c10' }}>
      <div className="w-full max-w-sm">
        {isSimulation && (
          <div className="mb-4 px-3 py-2 rounded-lg text-xs text-center"
               style={{ background: 'rgba(250,204,21,0.1)', border: '1px solid rgba(250,204,21,0.3)', color: '#facc15' }}>
            ⚠️ MODO SIMULACIÓN — Sin dinero real
          </div>
        )}
        <div className="text-center mb-8">
          <span className="text-4xl">🌳</span>
          <h1 className="mt-2 text-2xl font-bold text-white">Bosques DAO</h1>
          <p className="mt-1 text-sm" style={{ color: '#9ca3af' }}>
            {mode === 'login' ? 'Inicia sesión en tu cuenta' : 'Crea tu cuenta'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#9ca3af' }}>Correo electrónico</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} required
              placeholder="tu@email.com"
              className="w-full px-4 py-3 rounded-lg text-white text-sm outline-none"
              style={{ background: '#111827', border: '1px solid #1f2937' }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#9ca3af' }}>PIN (mínimo 6 caracteres)</label>
            <input
              type="password" value={pin} onChange={e => setPin(e.target.value)} required
              minLength={6} placeholder="••••••"
              className="w-full px-4 py-3 rounded-lg text-white text-sm outline-none"
              style={{ background: '#111827', border: '1px solid #1f2937' }}
            />
          </div>

          {error && <p className="text-xs" style={{ color: '#f87171' }}>{error}</p>}
          {message && <p className="text-xs" style={{ color: '#4ade80' }}>{message}</p>}

          <button
            type="submit" disabled={loading}
            className="w-full py-3 rounded-lg font-semibold text-sm disabled:opacity-50"
            style={{ background: '#00e5c4', color: '#080c10' }}
          >
            {loading ? 'Cargando...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>

        <div className="my-4 flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: '#1f2937' }} />
          <span className="text-xs" style={{ color: '#4b5563' }}>o</span>
          <div className="flex-1 h-px" style={{ background: '#1f2937' }} />
        </div>

        <button
          onClick={handleGoogle}
          className="w-full py-3 rounded-lg font-medium text-sm text-white flex items-center justify-center gap-2"
          style={{ background: '#1f2937', border: '1px solid #374151' }}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continuar con Google
        </button>

        <p className="mt-6 text-center text-xs" style={{ color: '#6b7280' }}>
          {mode === 'login' ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
          <button
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setMessage('') }}
            className="underline"
            style={{ color: '#00e5c4' }}
          >
            {mode === 'login' ? 'Regístrate' : 'Inicia sesión'}
          </button>
        </p>
      </div>
    </div>
  )
}
