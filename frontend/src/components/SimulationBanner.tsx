/**
 * SimulationBanner — fixed orange bar shown when VITE_SIMULATION_MODE=true.
 * Clearly communicates to demo viewers that no real money is involved.
 */
export default function SimulationBanner() {
  if (import.meta.env.VITE_SIMULATION_MODE !== 'true') return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center py-1 text-xs font-semibold tracking-wide"
      style={{ background: '#f59e0b', color: '#1a1a1a', height: '28px' }}
    >
      🟡 MODO SIMULACIÓN — Las transacciones son ficticias. Sin dinero real.
    </div>
  );
}
