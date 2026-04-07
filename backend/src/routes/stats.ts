/**
 * GET /api/stats
 * Public endpoint — returns live platform stats from the sim store.
 * No auth required (used by Landing page).
 */
import { Router, Request, Response } from 'express';
import { getSimStats } from '../data/simStore';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const stats = getSimStats();
  return res.json(stats);
});

export default router;
