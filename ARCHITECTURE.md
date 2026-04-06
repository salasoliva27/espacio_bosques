# Architecture — Espacio Bosques

## System Overview

Three-tier web application. In the current POC, the blockchain layer is simulated — no smart contracts are deployed yet. The system is designed so that the simulation layer can be swapped for real contracts without frontend changes.

---

## Component Diagram

```
┌──────────────────────────────────────────────────────────┐
│                       FRONTEND                           │
│   React 18 + Vite + TypeScript + Tailwind                │
│                                                          │
│   Pages:                                                 │
│   ├── Landing          (hero, features, CTA)            │
│   ├── Dashboard        (project grid, funding %)        │
│   ├── ProjectDetail    (milestones, funding, activity)  │
│   └── CreateProject    (AI pitch → blueprint → chat)    │
│                                                          │
│   Components:                                            │
│   ├── Navbar           (logo, nav, lang toggle, user)   │
│   ├── AuthScreen       (sign-in / sign-up / Google)     │
│   ├── InvestModal      (MXN → quote → confirm)          │
│   └── SimulationBanner (warns when in sim mode)         │
│                                                          │
│   Lib:                                                   │
│   ├── auth.ts          (Supabase client + helpers)      │
│   ├── i18n.ts          (EN/ES translations, t())        │
│   └── LanguageContext  (React context for lang toggle)  │
│                                                          │
└──────────────────┬───────────────────────────────────────┘
                   │ HTTP (axios, /api/*)
                   │ Supabase JS SDK (auth only)
                   │
┌──────────────────▼───────────────────────────────────────┐
│                       BACKEND                            │
│   Node.js 18 + Express + TypeScript                      │
│                                                          │
│   Routes:                                                │
│   ├── /api/auth         JWT login (legacy, unused)      │
│   ├── /api/projects     CRUD → falls back to simStore   │
│   ├── /api/ai           create-project + refine-bp      │
│   ├── /api/invest       quote (Bitso) + buy (simulated) │
│   ├── /api/simulate     drone telemetry (demo data)     │
│   └── /api/reports      AI-generated project reports    │
│                                                          │
│   AI (backend/src/ai/):                                  │
│   ├── adapters/project_creator.ts   (blueprint gen)     │
│   ├── adapters/report_generator.ts  (project reports)   │
│   └── adapters/drone_simulator.ts   (telemetry mock)    │
│                                                          │
│   Services:                                              │
│   ├── bitso.ts          (quote + simulateBuy)           │
│   └── wallet.ts         (fundProject — sim tx hash)     │
│                                                          │
│   Data:                                                  │
│   └── simStore.ts       (shared in-memory demo state)   │
│       ├── DEMO_PROJECTS[]   (mutable, both routes use)  │
│       └── addSimInvestment() (updates fundingRaised)    │
│                                                          │
│   Config:                                                │
│   └── mode.ts           (SIMULATION_MODE flag)          │
│                                                          │
└──────┬────────────────────────┬────────────────────────-─┘
       │ SQL (Prisma)            │ Supabase Admin SDK
       │ (optional — skipped     │ (auth verification)
       │  in simulation mode)    │
       │                         │
┌──────▼──────────┐    ┌─────────▼───────────────────────┐
│  PostgreSQL      │    │  Supabase                       │
│  (Prisma ORM)   │    │  ├── auth.users (email + OAuth) │
│                 │    │  └── (schema TBD — see ROADMAP) │
│  Tables (exist  │    └─────────────────────────────────┘
│  in schema, not │
│  yet used in    │
│  sim mode):     │
│  - users        │
│  - projects     │
│  - milestones   │
│  - investments  │
│  - telemetry    │
│  - reports      │
└─────────────────┘
```

---

## Data Flows

### Auth

```
User → AuthScreen
  → supabase.auth.signInWithPassword() / signInWithOAuth()
    ← Supabase returns session (JWT)
  → Frontend stores session, calls onSuccess()
  → Navbar reads user.user_metadata.full_name || email prefix
```

### AI Blueprint Creation

```
User → CreateProject (pitch textarea)
  → POST /api/ai/create-project { prompt }
    → backend/ai/adapters/project_creator.ts
      → Anthropic claude-sonnet-4-6
        ← JSON: { title, summary, category, milestones[], monitoringHints[] }
      → knowledge/base.ts context injected into every prompt
    ← Blueprint returned to frontend
  → Side-by-side view: blueprint panel + chat panel
```

### Blueprint Refinement (Chat Loop)

```
User → types refinement request
  → POST /api/ai/refine-blueprint { currentBlueprint, message, conversationHistory }
    → backend maintains Anthropic message history (user/assistant alternating)
    → Returns: { blueprint (updated), message (assistant reply) }
  → Frontend updates blueprint panel live, appends to chat
  → Loop repeats until user clicks "Create Project"
```

### Investment Flow (Simulation)

```
User → ProjectDetail → "Fund this project"
  → InvestModal: user enters MXN amount
  → GET /api/invest/quote?mxn=1000
    → bitso.ts: getQuote() → Bitso sandbox API (or sim fallback)
    ← { mxn, eth, rate }
  → User confirms
  → POST /api/invest/buy { projectId, mxn }
    → simulateBuy() → fake Bitso order
    → fundProject() → fake tx hash
    → addSimInvestment(projectId, ethAmount) → mutates DEMO_PROJECTS in place
    ← { txHash, mxn, eth, simulation: true }
  → InvestModal closes → ProjectDetail.fetchProject() re-runs
    → GET /api/projects/:id → returns updated fundingRaised from simStore
  → Funding card reflects new percentage
```

### Simulation Mode Fallback

```
Any route that calls Prisma:
  try:
    → normal Prisma call
  catch (DB unavailable):
    → if SIMULATION_MODE(): return in-memory data from simStore.ts
    → else: return 500
```

POST /api/projects checks SIMULATION_MODE() upfront (before the try) to
avoid unnecessary Prisma calls when in simulation mode.

---

## Technology Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React 18 + Vite | Dark UI, `#080c10` bg |
| Styling | Tailwind CSS + inline styles | Primary: `#00e5c4` (teal) |
| Icons | Lucide React | Replaces all emoji icons |
| i18n | Custom `i18n.ts` | EN + ES, localStorage persistence |
| Auth | Supabase JS SDK | Email/password + Google OAuth |
| HTTP client | Axios | Vite proxy → backend |
| Backend | Node.js 18 + Express | TypeScript |
| ORM | Prisma | Optional — skipped in simulation mode |
| AI | Anthropic SDK | `claude-sonnet-4-6` |
| Investment | Bitso REST API | Sandbox + simulation fallback |
| Blockchain (future) | Hardhat + Solidity | Contracts exist, not yet deployed |

---

## Environment Variables

| Variable | Where used | Required for |
|----------|-----------|--------------|
| `ANTHROPIC_API_KEY` | backend | AI blueprint + report generation |
| `SUPABASE_URL` | frontend + backend | Auth |
| `SUPABASE_ANON_KEY` | frontend | Auth |
| `SUPABASE_SERVICE_ROLE_KEY` | backend | Admin auth verification |
| `BITSO_API_KEY` | backend | Live Bitso quotes |
| `BITSO_API_SECRET` | backend | Live Bitso quotes |
| `DATABASE_URL` | backend | Prisma (skipped in simulation) |
| `SIMULATION_MODE` | backend | Force simulation (`true` by default if DB unavailable) |
| `ANTHROPIC_MODEL` | backend | Defaults to `claude-sonnet-4-6` |

All keys auto-loaded from `salasoliva27/dotfiles` in Codespaces.

---

## Security Notes

- No private keys or seed phrases are ever stored in the frontend
- Bitso API calls are proxied through the backend — keys never reach the browser
- Supabase RLS policies will be required before any real user data is stored (see ROADMAP)
- Investment amounts go through Bitso's regulated IFPE infrastructure (Ley Fintech / CNBV)

---

## Assumptions & Trade-offs

See [ASSUMPTIONS.md](./ASSUMPTIONS.md).
