/**
 * POST /api/rfc/validate
 *
 * Validates an RFC using two layers:
 *   1. Structural validation — format regex (always runs, always reliable)
 *   2. SAT 69-B blacklist   — checks against SAT's public fraud list (cached, updated daily)
 *
 * The old SAT SIAT scraper has been removed. That endpoint requires RFC + name + CP
 * submitted together (it's a verification form, not a lookup), has a CAPTCHA,
 * and was returning service_unavailable on every request.
 *
 * For full identity lookup (name, sex, birth state), integrate Moffin or Nufi
 * CURP API once credentials are available. See backend/src/services/moffin.ts (stub).
 *
 * Body: { rfc: string }
 * Response:
 *   {
 *     rfc: string,
 *     valid: boolean,
 *     birthDate: string | null,    // ISO date extracted from RFC, e.g. "1985-03-12"
 *     blacklist: {
 *       status: 'clean' | 'presunto' | 'definitivo' | 'service_unavailable',
 *       name?: string,             // SAT-registered name if found on list
 *       situation?: string,        // raw SAT status string
 *       listUpdatedAt?: string,    // ISO date of last list refresh
 *     }
 *   }
 *
 * Frontend behavior:
 *   clean              → allow registration
 *   presunto           → warn user, allow through (SAT investigation pending)
 *   definitivo         → block registration
 *   service_unavailable → allow through (don't block on list download failure)
 */

import { Router, Request, Response } from 'express';
import { checkBlacklist } from '../services/satBlacklist';
import { logger } from '../utils/logger';

const router = Router();

const RFC_REGEX = /^[A-ZÑ&]{4}\d{6}[A-Z\d]{3}$/;

/** Extract ISO birth date string from RFC (YYMMDD at positions 4-10) */
function extractBirthDateIso(rfc: string): string | null {
  const upper = rfc.toUpperCase().trim();
  if (upper.length < 10) return null;
  const datePart = upper.slice(4, 10);
  const yy = parseInt(datePart.slice(0, 2), 10);
  const mm = parseInt(datePart.slice(2, 4), 10);
  const dd = parseInt(datePart.slice(4, 6), 10);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  const currentYY = new Date().getFullYear() % 100;
  const fullYear = yy > currentYY ? 1900 + yy : 2000 + yy;
  const d = new Date(fullYear, mm - 1, dd);
  if (d.getMonth() !== mm - 1 || d.getDate() !== dd) return null;
  return `${fullYear}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

router.post('/validate', async (req: Request, res: Response) => {
  const { rfc } = req.body;

  if (!rfc || typeof rfc !== 'string') {
    return res.status(400).json({ error: 'rfc is required' });
  }

  const upper = rfc.toUpperCase().trim();

  if (!RFC_REGEX.test(upper)) {
    return res.status(400).json({ error: 'Formato de RFC inválido' });
  }

  const birthDate = extractBirthDateIso(upper);
  logger.info(`[rfc] validating ${upper}`);

  const blacklistResult = await checkBlacklist(upper);

  return res.json({
    rfc: upper,
    valid: true,
    birthDate,
    blacklist: {
      status: blacklistResult.status,
      ...(blacklistResult.entry && {
        name: blacklistResult.entry.name,
        situation: blacklistResult.entry.situation,
      }),
      ...(blacklistResult.listUpdatedAt && {
        listUpdatedAt: blacklistResult.listUpdatedAt.toISOString(),
      }),
    },
  });
});

export default router;
