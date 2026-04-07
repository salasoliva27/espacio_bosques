/**
 * Balance routes
 *
 * GET /api/balance/me  — returns the authenticated user's MXN balance
 *
 * SIMULATION MODE: balance is in-memory, starts at $10,000 MXN per user.
 * PRODUCTION NOTE: this endpoint must proxy to the Bitso API (GET /v3/balance)
 * using the user's delegated OAuth token. The platform NEVER holds MXN funds.
 * Bitso is the licensed IFPE custodian (Ley Fintech, Art. 18).
 */
import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { getSimBalance, addSimBalance } from '../data/simStore';
import { SIMULATION_MODE } from '../config/mode';
import { getAccountBalance } from '../services/bitso';

const router = Router();

/**
 * GET /api/balance/me
 * Returns the authenticated user's simulated MXN balance.
 */
router.get('/me', requireAuth, (req: AuthRequest, res: Response) => {
  const balance = getSimBalance(req.user!.id);
  return res.json({
    mxn: balance,
    simulation: true,
    note: 'Production: this reflects the user\'s Bitso MXN wallet — platform holds no funds.',
  });
});

/**
 * POST /api/balance/deposit
 * Simulation-only: add MXN to the user's balance.
 * Body: { mxn: number }  — min 100, max 50 000 per deposit.
 *
 * Production equivalent: user initiates a Bitso SPEI deposit from their bank.
 * The platform never holds funds; Bitso is the licensed IFPE custodian.
 */
router.post('/deposit', requireAuth, (req: AuthRequest, res: Response) => {
  if (!SIMULATION_MODE()) {
    return res.status(403).json({ error: 'Deposit endpoint only available in simulation mode' });
  }

  const { mxn } = req.body;
  const amount = Number(mxn);

  if (!amount || isNaN(amount) || amount < 100) {
    return res.status(400).json({ error: 'Minimum deposit is $100 MXN' });
  }
  if (amount > 50_000) {
    return res.status(400).json({ error: 'Maximum deposit per transaction is $50,000 MXN' });
  }

  const newBalance = addSimBalance(req.user!.id, amount);
  return res.json({
    added: amount,
    balance: newBalance,
    simulation: true,
    note: 'Production: user sends SPEI to their Bitso account — Espacio Bosques never holds funds.',
  });
});

/**
 * GET /api/balance/bitso
 * Fetches the real MXN balance from the Bitso sandbox account.
 * Requires real BITSO_API_KEY / BITSO_API_SECRET in .env.
 */
router.get('/bitso', requireAuth, async (_req: AuthRequest, res: Response) => {
  const result = await getAccountBalance();
  return res.json(result);
});

/**
 * POST /api/balance/sync-bitso
 * Simulation-only: reads the real Bitso sandbox MXN balance and seeds it
 * into the user's sim wallet (replaces current balance with Bitso amount).
 * This lets you simulate spending your real sandbox funds.
 */
router.post('/sync-bitso', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!SIMULATION_MODE()) {
    return res.status(403).json({ error: 'Only available in simulation mode' });
  }

  const bitso = await getAccountBalance();
  if (!bitso.connected) {
    return res.status(502).json({
      error: bitso.error,
      hint: 'Add your real Bitso sandbox API keys to .env (BITSO_API_KEY, BITSO_API_SECRET)',
    });
  }

  // Set sim balance to exactly the Bitso sandbox MXN balance
  const userId = req.user!.id;
  const currentBalance = getSimBalance(userId);
  const delta = bitso.mxn - currentBalance;
  addSimBalance(userId, delta);

  return res.json({
    synced: true,
    bitsoMxn: bitso.mxn,
    simBalance: bitso.mxn,
    note: 'Sim wallet seeded from Bitso sandbox. Spending here simulates your sandbox account.',
  });
});

export default router;
