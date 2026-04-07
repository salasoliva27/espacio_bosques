/**
 * Bitso sandbox service — HMAC-signed requests to Bitso API v3.
 * Falls back to mock rate when BITSO_API_KEY/SECRET are missing (SIMULATION_MODE).
 *
 * Sandbox URL: https://api-dev.bitso.com/v3
 * Production URL: https://api.bitso.com/v3
 */
import crypto from 'crypto';
import axios from 'axios';
import { SIMULATION_MODE } from '../config/mode';
import { logger } from '../utils/logger';

const BITSO_BASE = process.env.BITSO_SANDBOX_URL || 'https://api-dev.bitso.com/v3';

// Simulated ETH/MXN rate used when keys are absent or simulation mode is active
const MOCK_ETH_MXN_RATE = 65000; // 1 ETH ≈ 65,000 MXN (demo rate)

function hasRealKeys(): boolean {
  const key = process.env.BITSO_API_KEY;
  const secret = process.env.BITSO_API_SECRET;
  return Boolean(key && secret && key !== 'your_key' && secret !== 'your_secret');
}

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
  if (!hasRealKeys()) {
    logger.info(`[bitso] no real keys — using mock rate ${MOCK_ETH_MXN_RATE} MXN/ETH`);
    return MOCK_ETH_MXN_RATE;
  }

  try {
    const path = `/v3/ticker/?book=${book}`;
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
    simulation: !hasRealKeys(),
  };
}

/**
 * Execute a simulated buy order (POC — no real order placed).
 * In a real integration this would POST to /v3/orders/.
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

/**
 * Fetch the MXN balance from the real Bitso sandbox account.
 * Returns the available MXN balance, or an error if keys aren't configured.
 */
export async function getAccountBalance(): Promise<{
  mxn: number;
  connected: boolean;
  error?: string;
}> {
  if (!hasRealKeys()) {
    return {
      mxn: 0,
      connected: false,
      error: 'Bitso sandbox API keys not configured. Add BITSO_API_KEY and BITSO_API_SECRET to .env.',
    };
  }

  try {
    const path = '/v3/balance/';
    const authorization = hmacSign(
      process.env.BITSO_API_KEY!,
      process.env.BITSO_API_SECRET!,
      'GET',
      path,
      ''
    );

    const response = await axios.get(`${BITSO_BASE}/balance/`, {
      headers: { Authorization: authorization },
      timeout: 8000,
    });

    const balances: any[] = response.data.payload.balances;
    const mxnBalance = balances.find((b: any) => b.currency === 'mxn');
    const mxn = mxnBalance ? parseFloat(mxnBalance.available) : 0;

    logger.info(`[bitso] sandbox MXN balance: ${mxn}`);
    return { mxn, connected: true };
  } catch (err: any) {
    logger.warn(`[bitso] balance fetch failed: ${err.message}`);
    return {
      mxn: 0,
      connected: false,
      error: `Bitso API error: ${err.response?.data?.error?.message || err.message}`,
    };
  }
}
