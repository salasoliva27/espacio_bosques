/**
 * POST /api/rfc/validate
 *
 * Validates an RFC against the SAT registry (padron de contribuyentes).
 * Used during registration to confirm the RFC is real and active.
 *
 * Body: { rfc: string }
 * Response:
 *   { registered: true,  status: 'found', birthDate: '1985-03-12' }
 *   { registered: false, status: 'not_found', message: '...' }
 *   { registered: false, status: 'service_unavailable', message: '...' }
 *
 * 'service_unavailable' means the SAT service could not be reached.
 * The frontend should treat this as a degraded state and allow registration
 * through with structural-only validation (not block entirely).
 *
 * 'not_found' means the RFC is not in the SAT registry — block registration.
 */

import { Router, Request, Response } from 'express';
import { validateRfcWithSat } from '../services/satRfc';
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
  logger.info(`[rfc] validating ${upper} with SAT`);

  const result = await validateRfcWithSat(upper);

  return res.json({
    ...result,
    rfc: upper,
    birthDate, // ISO date string extracted from RFC, always present if format is valid
  });
});

export default router;
