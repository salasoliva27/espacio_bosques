import { useT } from '../context/LanguageContext';

export default function SimulationBanner() {
  const t = useT();
  if (import.meta.env.VITE_SIMULATION_MODE !== 'true') return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center py-1 text-xs font-semibold tracking-wide"
      style={{ background: '#f59e0b', color: '#1a1a1a', height: '28px' }}
    >
      {t('sim.banner')}
    </div>
  );
}
