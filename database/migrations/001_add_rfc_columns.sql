-- Migration 001: Add RFC identity columns to eb_profiles
-- Run in: Supabase Dashboard → SQL Editor
-- Idempotent — safe to run multiple times.

ALTER TABLE public.eb_profiles
  ADD COLUMN IF NOT EXISTS full_name    text,
  ADD COLUMN IF NOT EXISTS rfc          text UNIQUE,
  ADD COLUMN IF NOT EXISTS rfc_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS rfc_status   text    DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS birth_date   date;
