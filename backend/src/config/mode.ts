export const SIMULATION_MODE = process.env.SIMULATION_MODE === 'true'

export const BITSO_BASE_URL = SIMULATION_MODE
  ? (process.env.BITSO_SANDBOX_URL ?? 'https://api-dev.bitso.com/v3')
  : (process.env.BITSO_PROD_URL ?? 'https://api.bitso.com/v3')

export const BLOCKCHAIN_RPC = SIMULATION_MODE
  ? 'http://127.0.0.1:8545'
  : (process.env.RPC_URL ?? 'http://127.0.0.1:8545')

console.log(`[espacio-bosques] ${SIMULATION_MODE ? '🟡 SIMULACIÓN' : '🔴 PRODUCTION'}`)
console.log(`[espacio-bosques] Bitso: ${BITSO_BASE_URL}`)
console.log(`[espacio-bosques] RPC: ${BLOCKCHAIN_RPC}`)
