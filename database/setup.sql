-- ============================================================
-- ESPACIO BOSQUES — Supabase Setup
-- Project: rycybujjedtofghigyxm.supabase.co
-- All tables prefixed with eb_ (shared Supabase instance)
--
-- WHERE TO RUN THIS:
--   Supabase Dashboard → SQL Editor
--   URL: https://supabase.com/dashboard/project/rycybujjedtofghigyxm/sql/new
--
-- This script is IDEMPOTENT — safe to run multiple times.
-- It creates the table if missing, and adds any missing columns.
-- ============================================================

-- ── eb_profiles ──────────────────────────────────────────────────────────────
-- One row per registered user. Populated automatically on first login via
-- POST /api/user/profile/init → reads auth.users.user_metadata.
--
-- Identity fields (set at registration, not user-editable):
--   full_name, rfc, rfc_verified, rfc_status, birth_date
-- User-editable fields:
--   display_name, neighborhood

CREATE TABLE IF NOT EXISTS public.eb_profiles (
  id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Display
  display_name  text,                        -- shown in UI, defaults to full_name
  neighborhood  text,                        -- Bosques neighborhood (optional, set in-app)

  -- Identity from registration (not user-editable)
  full_name     text,                        -- e.g. "Alejandro Salas Oliva"
  rfc           text UNIQUE,                 -- e.g. "SAOA850312H45"
  rfc_verified  boolean DEFAULT false,       -- true if SAT registry confirmed the RFC
  rfc_status    text DEFAULT 'pending',      -- 'found' | 'service_unavailable' | 'pending'
  birth_date    date,                        -- extracted from RFC (YYMMDD positions 5-10)

  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- Add missing columns if table already existed without them (idempotent)
ALTER TABLE public.eb_profiles
  ADD COLUMN IF NOT EXISTS display_name   text,
  ADD COLUMN IF NOT EXISTS neighborhood   text,
  ADD COLUMN IF NOT EXISTS full_name      text,
  ADD COLUMN IF NOT EXISTS rfc            text,
  ADD COLUMN IF NOT EXISTS rfc_verified   boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS rfc_status     text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS birth_date     date;

-- Unique index on rfc (if not already there from table creation)
CREATE UNIQUE INDEX IF NOT EXISTS eb_profiles_rfc_key ON public.eb_profiles(rfc);

-- ── Row Level Security ────────────────────────────────────────────────────────
ALTER TABLE public.eb_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "eb_profiles: read own" ON public.eb_profiles;
CREATE POLICY "eb_profiles: read own"
  ON public.eb_profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "eb_profiles: insert own" ON public.eb_profiles;
CREATE POLICY "eb_profiles: insert own"
  ON public.eb_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "eb_profiles: update own" ON public.eb_profiles;
CREATE POLICY "eb_profiles: update own"
  ON public.eb_profiles FOR UPDATE
  USING (auth.uid() = id);

-- ── Auto-update updated_at ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.eb_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS eb_profiles_updated_at ON public.eb_profiles;
CREATE TRIGGER eb_profiles_updated_at
  BEFORE UPDATE ON public.eb_profiles
  FOR EACH ROW EXECUTE FUNCTION public.eb_set_updated_at();


-- ============================================================
-- FUTURE TABLES (add here when needed, prefix with eb_)
-- ============================================================

-- eb_waitlist        — pre-registration waitlist for neighborhood residents
-- eb_projects        — if sim-data.json ever migrates to Supabase
-- eb_investments     — if investment data migrates from sim-data.json
-- eb_governance      — if governance data migrates from sim-data.json
-- eb_providers       — if provider data migrates from sim-data.json
