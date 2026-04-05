import { useState } from 'react'
import { getSession } from '../lib/auth'

interface InvestModalProps {
  projectId: string
  projectTitle: string
  onClose: () => void
}

type Step = 'amount' | 'quote' | 'done'

interface Quote {
  mxn: number
  eth: number
  rate: number
  simulation: boolean
}

interface InvestResult {
  investment: any
  transaction: any
  simulation: boolean
}

export default function InvestModal({ projectId, projectTitle, onClose }: InvestModalProps) {
  const [step, setStep] = useState<Step>('amount')
  const [mxn, setMxn] = useState('')
  const [quote, setQuote] = useState<Quote | null>(null)
  const [result, setResult] = useState<InvestResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const isSimulation = import.meta.env.VITE_SIMULATION_MODE === 'true'

  async function getQuote() {
    setError('')
    const amount = parseFloat(mxn)
    if (!amount || amount < 100) { setError('El monto mínimo es $100 MXN.'); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/invest/quote?mxn=${amount}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al obtener cotización')
      setQuote(data)
      setStep('quote')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function confirmInvest() {
    setError('')
    setLoading(true)
    try {
      const { data: { session } } = await getSession()
      if (!session) throw new Error('Necesitas iniciar sesión para invertir.')
      const res = await fetch('/api/invest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ projectId, mxnAmount: quote!.mxn, userId: session.user.id })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al procesar inversión')
      setResult(data)
      setStep('done')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
         style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-sm rounded-2xl p-6"
           style={{ background: '#111827', border: '1px solid #1f2937' }}>

        {isSimulation && (
          <div className="mb-4 px-3 py-2 rounded-lg text-xs text-center"
               style={{ background: 'rgba(250,204,21,0.1)', border: '1px solid rgba(250,204,21,0.3)', color: '#facc15' }}>
            ⚠️ SIMULACIÓN — Bitso Sandbox · Sin dinero real
          </div>
        )}

        {step === 'amount' && (
          <>
            <h2 className="text-lg font-bold text-white mb-1">Invertir en proyecto</h2>
            <p className="text-sm mb-4" style={{ color: '#9ca3af' }}>{projectTitle}</p>
            <label className="block text-xs mb-1" style={{ color: '#9ca3af' }}>Monto en pesos (MXN)</label>
            <input
              type="number" value={mxn} onChange={e => setMxn(e.target.value)}
              min={100} placeholder="500"
              className="w-full px-4 py-3 rounded-lg text-white text-sm mb-1"
              style={{ background: '#1f2937', border: '1px solid #374151' }}
            />
            <p className="text-xs mb-4" style={{ color: '#6b7280' }}>Mínimo $100 MXN · Procesado por Bitso</p>
            {error && <p className="text-xs mb-3" style={{ color: '#f87171' }}>{error}</p>}
            <button
              onClick={getQuote} disabled={loading}
              className="w-full py-3 rounded-lg font-semibold text-sm disabled:opacity-50"
              style={{ background: '#00e5c4', color: '#080c10' }}
            >
              {loading ? 'Consultando...' : 'Ver cotización'}
            </button>
          </>
        )}

        {step === 'quote' && quote && (
          <>
            <h2 className="text-lg font-bold text-white mb-4">Confirmar inversión</h2>
            <div className="space-y-3 mb-5">
              <div className="flex justify-between text-sm">
                <span style={{ color: '#9ca3af' }}>Pagas</span>
                <span className="font-semibold text-white">${quote.mxn.toLocaleString('es-MX')} MXN</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: '#9ca3af' }}>Tipo de cambio</span>
                <span style={{ color: '#d1d5db' }}>${quote.rate.toLocaleString('es-MX')} MXN/ETH</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: '#9ca3af' }}>Recibes (en contrato)</span>
                <span className="font-semibold text-white">{quote.eth.toFixed(6)} ETH</span>
              </div>
              <div className="pt-2 text-xs text-center" style={{ borderTop: '1px solid #374151', color: '#6b7280' }}>
                Procesado por Bitso {quote.simulation ? '(Sandbox)' : ''}
              </div>
            </div>
            {error && <p className="text-xs mb-3" style={{ color: '#f87171' }}>{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => setStep('amount')}
                className="flex-1 py-3 rounded-lg text-sm"
                style={{ background: '#1f2937', color: '#9ca3af' }}
              >
                Cambiar monto
              </button>
              <button
                onClick={confirmInvest} disabled={loading}
                className="flex-1 py-3 rounded-lg font-semibold text-sm disabled:opacity-50"
                style={{ background: '#00e5c4', color: '#080c10' }}
              >
                {loading ? 'Procesando...' : 'Confirmar'}
              </button>
            </div>
          </>
        )}

        {step === 'done' && (
          <div className="text-center py-4">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-lg font-bold text-white mb-2">¡Inversión realizada!</h2>
            <p className="text-sm mb-2" style={{ color: '#9ca3af' }}>Tu inversión fue procesada con éxito.</p>
            {result?.simulation && (
              <p className="text-xs mb-4" style={{ color: '#facc15' }}>Modo simulación — sin dinero real comprometido</p>
            )}
            {result?.transaction?.txHash && (
              <p className="text-xs mb-4 font-mono break-all" style={{ color: '#6b7280' }}>
                TX: {result.transaction.txHash}
              </p>
            )}
            <button
              onClick={onClose}
              className="w-full py-3 rounded-lg font-semibold text-sm"
              style={{ background: '#00e5c4', color: '#080c10' }}
            >
              Ver proyecto
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
