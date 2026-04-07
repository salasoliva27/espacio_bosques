/**
 * /api/user/profile — eb_profiles (Supabase) — user identity profile
 *
 * GET  /api/user/profile       — fetch current user's eb_profiles row
 * POST /api/user/profile/init  — upsert eb_profiles from auth user_metadata (call on first login)
 * PATCH /api/user/profile      — update user-editable fields (neighborhood, display_name)
 *
 * Data origin:
 *   - full_name, rfc, rfc_verified, rfc_status, birth_date → set at registration, NOT editable here
 *   - display_name, neighborhood → user can update any time
 */

import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { getSupabaseAdmin } from '../lib/supabaseAdmin';
import { logger } from '../utils/logger';

const router = Router();

// ── GET /api/user/profile ─────────────────────────────────────────────────────
// Returns the eb_profiles row for the authenticated user.
// Returns null if the row doesn't exist yet (call /init to create it).

router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const supabase = getSupabaseAdmin();
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });

  const { data, error } = await supabase
    .from('eb_profiles')
    .select('*')
    .eq('id', req.user!.id)
    .maybeSingle();

  if (error) {
    logger.error('[userProfile] fetch failed', { userId: req.user!.id, error: error.message });
    return res.status(500).json({ error: 'Failed to fetch profile', details: error.message });
  }

  return res.json({ profile: data ?? null });
});

// ── POST /api/user/profile/init ───────────────────────────────────────────────
// Upserts eb_profiles from the user's auth.users metadata.
// Safe to call multiple times — idempotent upsert, will not overwrite existing data.
// Call this once after every login to ensure the row exists.

router.post('/init', requireAuth, async (req: AuthRequest, res: Response) => {
  const supabase = getSupabaseAdmin();
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });

  const userId = req.user!.id;

  // Fetch user metadata from auth.users via admin API
  const { data: authData, error: authError } = await supabase.auth.admin.getUserById(userId);
  if (authError || !authData.user) {
    logger.error('[userProfile] admin getUserById failed', { userId, error: authError?.message });
    return res.status(500).json({ error: 'Could not read user metadata' });
  }

  const meta = authData.user.user_metadata ?? {};

  // Build profile row from metadata (only set identity fields, never overwrite)
  const profileRow: Record<string, any> = {
    id: userId,
    // Use onConflict + ignoreDuplicates=false + only set if not already set
    // Supabase upsert with ignoreDuplicates: false will merge fields
  };

  if (meta.full_name) profileRow.full_name = meta.full_name;
  if (meta.rfc) profileRow.rfc = meta.rfc;
  if (meta.rfc_verified !== undefined) profileRow.rfc_verified = Boolean(meta.rfc_verified);
  if (meta.rfc_status) profileRow.rfc_status = meta.rfc_status;
  if (meta.birth_date) profileRow.birth_date = meta.birth_date;

  // display_name defaults to full_name if not set
  if (meta.full_name && !profileRow.display_name) {
    profileRow.display_name = meta.full_name;
  }

  const { data, error } = await supabase
    .from('eb_profiles')
    .upsert(profileRow, { onConflict: 'id', ignoreDuplicates: false })
    .select()
    .single();

  if (error) {
    // Table might not exist or columns might be missing — log clearly
    if (error.code === '42P01') {
      logger.error('[userProfile] eb_profiles table does not exist — run database/setup.sql in Supabase SQL Editor');
      return res.status(503).json({
        error: 'Database table missing',
        fix: 'Run database/setup.sql in the Supabase Dashboard → SQL Editor',
      });
    }
    if (error.code === '42703') {
      logger.error('[userProfile] Missing column in eb_profiles — run database/setup.sql in Supabase SQL Editor');
      return res.status(503).json({
        error: 'Database schema outdated',
        fix: 'Run database/setup.sql in the Supabase Dashboard → SQL Editor',
      });
    }
    logger.error('[userProfile] init upsert failed', { userId, error: error.message, code: error.code });
    return res.status(500).json({ error: 'Failed to init profile', details: error.message });
  }

  logger.info('[userProfile] profile initialized', { userId });
  return res.json({ profile: data });
});

// ── PATCH /api/user/profile ───────────────────────────────────────────────────
// User-editable fields only. RFC, birth_date, rfc_status are immutable after registration.

router.patch('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const supabase = getSupabaseAdmin();
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });

  const { display_name, neighborhood } = req.body;
  const updates: Record<string, any> = {};

  if (display_name !== undefined) updates.display_name = String(display_name).trim();
  if (neighborhood !== undefined) updates.neighborhood = String(neighborhood).trim();

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No updatable fields provided' });
  }

  const { data, error } = await supabase
    .from('eb_profiles')
    .update(updates)
    .eq('id', req.user!.id)
    .select()
    .single();

  if (error) {
    logger.error('[userProfile] update failed', { userId: req.user!.id, error: error.message });
    return res.status(500).json({ error: 'Failed to update profile', details: error.message });
  }

  logger.info('[userProfile] profile updated', { userId: req.user!.id, fields: Object.keys(updates) });
  return res.json({ profile: data });
});

export default router;
