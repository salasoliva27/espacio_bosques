/**
 * Bitso sandbox service — HMAC-signed requests to Bitso API v3.
 * Falls back to mock rate when BITSO_API_KEY/SECRET are missing (SIMULATION_MODE).
 */
import crypto from 'crypto';
import axios from 'axios';
import { SIMULATION_MODE } from '../config/mode';
import { logger } from '../utils/logger';

const BITSO_BASE = 'https://sandbox.bitso.com/api/v3';

// Simulated ETH/MXN rate used when keys are absent or simulation mode is active
const MOCK_ETH_MXN_RATE = 65000; // 1 ETH ≈ 65,000 MXN (demo rate)

function hmacSign(
  apiKey: string,
  apiSecret: string,
  method: string,
  path: string,
  body: string
): string {
  const nonce = Date.now().toString();
  const message = `${nonce}${method.toUpperCase()}${path}${body}`;
  const signature = crypto
    .createHmac('sha256', apiSecret)
    .update(message)
    .digest('hex');
  return `Bitso ${apiKey}:${nonce}:${signature}`;
}

async function ticker(book: string): Promise<number> {
  if (SIMULATION_MODE() || !process.env.BITSO_API_KEY) {
    logger.info(`[bitso] simulation mode — using mock rate ${MOCK_ETH_MXN_RATE} MXN/ETH`);
    return MOCK_ETH_MXN_RATE;
  }

  try {
    const path = `/api/v3/ticker/?book=${book}`;
    const authorization = hmacSign(
      process.env.BITSO_API_KEY!,
      process.env.BITSO_API_SECRET!,
      'GET',
      path,
      ''
    );

    const response = await axios.get(`${BITSO_BASE}/ticker/?book=${book}`, {
      headers: { Authorization: authorization },
      timeout: 8000,
    });

    const rate = parseFloat(response.data.payload.ask);
    logger.info(`[bitso] live rate for ${book}: ${rate}`);
    return rate;
  } catch (err: any) {
    logger.warn(`[bitso] API error, falling back to mock rate: ${err.message}`);
    return MOCK_ETH_MXN_RATE;
  }
}

/**
 * Get an MXN → ETH quote.
 * Returns { mxn, eth, rate, simulation }
 */
export async function getQuote(mxn: number): Promise<{
  mxn: number;
  eth: number;
  rate: number;
  simulation: boolean;
}> {
  const rate = await ticker('eth_mxn');
  const eth = mxn / rate;
  return {
    mxn,
    eth: parseFloat(eth.toFixed(8)),
    rate,
    simulation: SIMULATION_MODE() || !process.env.BITSO_API_KEY,
  };
}

/**
 * Execute a simulated buy order (POC — no real order placed).
 * In a real integration this would POST to /api/v3/orders/.
 */
export async function simulateBuy(mxn: number): Promise<{
  orderId: string;
  mxn: number;
  eth: number;
  rate: number;
  simulation: boolean;
}> {
  const quote = await getQuote(mxn);
  const orderId = `SIM-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  logger.info(`[bitso] simulated buy: ${mxn} MXN → ${quote.eth} ETH (order: ${orderId})`);
  return { orderId, ...quote };
}
