export default function SimulationBanner() {
  if (import.meta.env.VITE_SIMULATION_MODE !== 'true') return null
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-400 text-black
                    text-center text-xs font-bold py-1.5">
      ⚠️ MODO SIMULACIÓN — Sin dinero real · Bitso Sandbox · Hardhat Local
    </div>
  )
}
