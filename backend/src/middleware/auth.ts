/**
 * Supabase JWT auth middleware — validates the Bearer token issued by Supabase Auth.
 * In simulation mode, accepts any token and sets a mock user.
 */
import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { SIMULATION_MODE } from '../config/mode';
import { logger } from '../utils/logger';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Lazy-init to avoid crashing when env vars aren't set
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

  // In simulation mode, accept any non-empty token
  if (SIMULATION_MODE()) {
    req.user = { id: 'sim-user', email: 'demo@bosques.mx', role: 'authenticated' };
    next();
    return;
  }

  const supabase = getSupabase();
  if (!supabase) {
    logger.warn('[auth] Supabase not configured — allowing request (dev only)');
    req.user = { id: 'dev-user', email: 'dev@bosques.mx', role: 'authenticated' };
    next();
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
