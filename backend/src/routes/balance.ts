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
import { getSimBalance } from '../data/simStore';

const router = Router();

router.get('/me', requireAuth, (req: AuthRequest, res: Response) => {
  const balance = getSimBalance(req.user!.id);
  return res.json({
    mxn: balance,
    simulation: true,
    note: 'Production: this reflects the user\'s Bitso MXN wallet — platform holds no funds.',
  });
});

export default router;
