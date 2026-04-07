# SUPABASE — What lives where

> This document is the canonical reference for data storage decisions in Espacio Bosques.
> **Update this file whenever data is added, moved, or removed.**

---

## Supabase project

| Field | Value |
|---|---|
| Project ID | `rycybujjedtofghigyxm` |
| URL | `https://rycybujjedtofghigyxm.supabase.co` |
| Shared with | All projects in the Janus portfolio |
| Table prefix | `eb_` |
| Schema file | `database/schema.sql` |

Credentials live in dotfiles (`salasoliva27/dotfiles`) and are available as:
- `$SUPABASE_URL`
- `$SUPABASE_SERVICE_ROLE_KEY`

---

## Data architecture

Espacio Bosques uses a **split storage model**:

| Data type | Where | Why |
|---|---|---|
| User authentication (email, password, OAuth) | Supabase `auth.users` (managed) | Built-in, secure, handles email verification |
| User profile metadata (name, RFC, birth date) | `auth.users.user_metadata` + `eb_profiles` | user_metadata: fast JWT access. eb_profiles: queryable, relational |
| Projects, investments, milestones | `backend/sim-data.json` (in-memory + file) | POC/simulation — migrates to `eb_projects` etc when moving to prod |
| Provider profiles, services | `backend/sim-data.json` | Same as above |
| Governance proposals, votes | `backend/sim-data.json` | Same as above |
| User wallet balances | `backend/sim-data.json` | Simulated — real balances via Bitso API in prod |
| File attachments (documents, reports) | Supabase Storage (`espacio-bosques-docs` bucket) | Binary files need object storage, not rows |

---

## Tables (current)

### `eb_profiles`

One row per registered user. Created on first app load.

| Column | Type | Description |
|---|---|---|
| `id` | uuid (PK, FK → auth.users) | Supabase auth user ID |
| `display_name` | text | Short display name shown in UI |
| `full_name` | text | Full legal name as entered at registration |
| `neighborhood` | text | Bosques sub-neighborhood (optional) |
| `rfc` | text (UNIQUE) | RFC in uppercase, e.g. SAOA850312H45 |
| `rfc_verified` | boolean | True if SAT registry confirmed RFC exists |
| `rfc_status` | text | `found` \| `service_unavailable` \| `structural_only` \| `pending` |
| `birth_date` | date | Birth date extracted from RFC (YYMMDD at positions 5-10) |
| `created_at` | timestamptz | Profile creation time |
| `updated_at` | timestamptz | Last update (auto-managed by trigger) |

**RLS policies:**
- Users can SELECT, INSERT, UPDATE their own row only (`auth.uid() = id`)
- No public read access

---

## Storage bucket

| Bucket | Access | Used for |
|---|---|---|
| `espacio-bosques-docs` | Private (signed URLs only) | Project documents, legal templates, governance attachments |

---

## What lives in `user_metadata` (auth.users)

Set at registration via `supabase.auth.signUp({ options: { data: {...} } })`.
Available client-side from the JWT without a DB query.

| Key | Value | Set when |
|---|---|---|
| `full_name` | "Alejandro Salas Oliva" | Registration |
| `rfc` | "SAOA850312H45" | Registration |
| `rfc_verified` | true/false | Registration (after SAT check) |
| `rfc_status` | "found" / "service_unavailable" | Registration |
| `birth_date` | "1985-03-12" (ISO) | Registration (extracted from RFC) |

---

## Migration path (sim → prod)

When the simulation phase ends and real transactions begin:

1. Run `database/schema.sql` in Supabase SQL Editor if not already applied
2. Create `eb_projects`, `eb_investments`, `eb_governance`, `eb_providers` tables (add to schema.sql)
3. Migrate existing sim-data.json records to the new tables (write a one-time migration script)
4. Remove simStore.ts and switch routes to Supabase queries
5. Update this document

---

## Applying the schema / migrations

The `eb_profiles` table was created in an earlier session. New columns need to be added via migration.

**⚠ Action required — run in Supabase Dashboard → SQL Editor:**

```sql
-- Paste and run: database/migrations/001_add_rfc_columns.sql
ALTER TABLE public.eb_profiles
  ADD COLUMN IF NOT EXISTS full_name    text,
  ADD COLUMN IF NOT EXISTS rfc          text UNIQUE,
  ADD COLUMN IF NOT EXISTS rfc_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS rfc_status   text    DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS birth_date   date;
```

For a fresh setup, run `database/schema.sql` (creates the full table from scratch).  
Idempotent — both files are safe to run multiple times.

---

## Bitso API keys

Keys live in dotfiles (`salasoliva27/dotfiles`). They are loaded into new Codespaces automatically.  
In an existing Codespace, if `BITSO_API_KEY` is not set in the shell, copy the key values manually into `.env`.  
The Bitso service (`backend/src/services/bitso.ts`) degrades gracefully to a mock rate when keys are absent.
