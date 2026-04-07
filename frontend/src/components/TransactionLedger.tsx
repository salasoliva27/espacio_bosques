/**
 * TransactionLedger — public disbursement ledger for a project.
 * Shows: provider real legal name, masked bank (BBVA ****4614), CFDI UUID, amount, date.
 */
import { useState, useEffect } from 'react';
import { Banknote } from 'lucide-react';

interface Transaction {
  id: string;
  milestoneTitle: string;
  providerName: string;
  bankMasked: string;
  cfdiUuid: string;
  amountMxn: number;
  date: string;
  status: 'PENDING' | 'COMPLETED';
}

interface Props { projectId: string; }

function fmt(n: number) {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
}

function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function TransactionLedger({ projectId }: Props) {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/governance/projects/${projectId}/transactions`)
      .then(r => r.json())
      .then(d => { setTxs(d.transactions || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [projectId]);

  if (loading) return null;

  return (
    <div className="rounded-xl p-6" style={{ background: '#0d1520', border: '1px solid #1e2d3d' }}>
      <div className="flex items-center gap-2 mb-5">
        <Banknote size={15} style={{ color: '#00e5c4' }} />
        <h2 className="text-base font-semibold" style={{ color: '#e8f4f0' }}>Disbursement Ledger</h2>
        <span className="text-xs ml-auto" style={{ color: '#6b7280' }}>Public · {txs.length} records</span>
      </div>

      {txs.length === 0 ? (
        <p className="text-sm" style={{ color: '#6b7280' }}>No disbursements recorded yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ color: '#6b7280', borderBottom: '1px solid #1e2d3d' }}>
                <th className="text-left py-2 pr-4 font-medium">Milestone</th>
                <th className="text-left py-2 pr-4 font-medium">Provider</th>
                <th className="text-left py-2 pr-4 font-medium">Bank</th>
                <th className="text-left py-2 pr-4 font-medium">CFDI</th>
                <th className="text-right py-2 pr-4 font-medium">Amount</th>
                <th className="text-right py-2 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {txs.map(tx => (
                <tr key={tx.id} style={{ borderBottom: '1px solid #111d2b' }}>
                  <td className="py-3 pr-4" style={{ color: '#e8f4f0' }}>{tx.milestoneTitle}</td>
                  <td className="py-3 pr-4 font-medium" style={{ color: '#9ca3af' }}>{tx.providerName}</td>
                  <td className="py-3 pr-4 font-mono" style={{ color: '#6b7280' }}>{tx.bankMasked}</td>
                  <td className="py-3 pr-4 font-mono" style={{ color: '#374151', maxWidth: 120 }}>
                    <span title={tx.cfdiUuid}>{tx.cfdiUuid.slice(0, 8)}…</span>
                  </td>
                  <td className="py-3 pr-4 text-right font-semibold tabular-nums" style={{ color: '#10b981' }}>
                    {fmt(tx.amountMxn)}
                  </td>
                  <td className="py-3 text-right" style={{ color: '#6b7280' }}>{fmtDate(tx.date)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} className="pt-4 text-xs" style={{ color: '#4b5563' }}>
                  All provider names match their SAT RFC legal name. No aliases allowed.
                </td>
                <td className="pt-4 text-right font-bold tabular-nums" style={{ color: '#e8f4f0' }}>
                  {fmt(txs.reduce((s, t) => s + t.amountMxn, 0))}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
