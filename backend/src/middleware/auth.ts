/**
 * Supabase JWT auth middleware.
 *
 * SIMULATION_MODE does NOT bypass real auth.
 * It only signals that blockchain/Bitso operations are simulated.
 *
 * Token handling:
 *  - Real Supabase JWT → always validated against Supabase, real user ID used
 *  - Literal "sim-token" → only accepted in simulation mode, sets id="sim-user" (test harness only)
 */
import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { SIMULATION_MODE } from '../config/mode';
import { logger } from '../utils/logger';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase && supabaseUrl && supabaseKey) {
    _supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _supabase;
}

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role?: string;
  };
}

export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing authorization header' });
    return;
  }

  const token = authHeader.slice(7);

  // Allow literal sim-token only in simulation mode (test harness / curl scripts)
  if (token === 'sim-token') {
    if (SIMULATION_MODE()) {
      req.user = { id: 'sim-user', email: 'test@bosques.mx', role: 'authenticated' };
      next();
      return;
    }
    res.status(401).json({ error: 'sim-token not accepted outside simulation mode' });
    return;
  }

  // Real JWT — validate against Supabase regardless of simulation mode
  const supabase = getSupabase();
  if (!supabase) {
    logger.error('[auth] Supabase not configured — cannot validate JWT');
    res.status(503).json({ error: 'Auth service not configured' });
    return;
  }

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }
    req.user = {
      id: data.user.id,
      email: data.user.email,
      role: data.user.role,
    };
    next();
  } catch (err: any) {
    logger.error('[auth] token validation failed', { error: err.message });
    res.status(401).json({ error: 'Authentication failed' });
  }
}
