-- ============================================================
-- ESPACIO BOSQUES — Supabase Schema
-- Project: salasoliva27/espacio_bosques
-- Supabase project: rycybujjedtofghigyxm.supabase.co
-- All tables are prefixed with eb_ (shared Supabase instance)
-- Run this in: Supabase Dashboard > SQL Editor
-- Last updated: 2026-04-07
-- ============================================================

-- ── eb_profiles ──────────────────────────────────────────────────────────────
-- One row per registered user. Mirrors auth.users but adds app-specific fields.
-- id references auth.users — cascades on user deletion.
-- Created automatically on first app load via Profile.tsx init check.

CREATE TABLE IF NOT EXISTS public.eb_profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Identity (mirrors user_metadata written during registration)
  display_name  text,
  full_name     text,                        -- e.g. "Alejandro Salas Oliva"
  neighborhood  text,                        -- Bosques neighborhood (optional, set in-app)

  -- RFC identity fields (populated at registration)
  rfc           text UNIQUE,                 -- e.g. "SAOA850312H45"
  rfc_verified  boolean DEFAULT false,       -- true if SAT registry confirmed the RFC
  rfc_status    text DEFAULT 'pending',      -- 'found' | 'service_unavailable' | 'structural_only' | 'pending'
  birth_date    date,                        -- extracted from RFC (YYMMDD positions 5-10)

  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- ── Row Level Security ────────────────────────────────────────────────────────
ALTER TABLE public.eb_profiles ENABLE ROW LEVEL SECURITY;

-- Users can only read their own profile
CREATE POLICY "eb_profiles: read own"
  ON public.eb_profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can insert their own profile row (on first load)
CREATE POLICY "eb_profiles: insert own"
  ON public.eb_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile
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
