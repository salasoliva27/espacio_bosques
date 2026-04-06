# Espacio Bosques

**Community Funding Platform — AI Blueprint Creation + Fiat Investment + On-Chain Escrow (roadmap)**

Espacio Bosques lets residents of Bosques de las Lomas propose, fund, and track community improvement projects. No crypto wallet required. Users invest in MXN via Bitso (licensed IFPE), funds are held in escrow and released milestone by milestone, and AI helps turn raw ideas into structured proposals.

---

## Current State (April 2026)

This is a working **POC in simulation mode**. All core flows are functional without a deployed smart contract or live database:

| Flow | Status |
|------|--------|
| Auth (Supabase email/password + Google OAuth) | ✅ Live |
| Landing page | ✅ |
| Dashboard — project list with funding progress | ✅ |
| Project detail — milestones, funding card, activity | ✅ |
| AI blueprint creation (Claude → structured proposal) | ✅ |
| Conversational blueprint refinement (chat loop) | ✅ |
| Invest flow — MXN → Bitso quote → simulated ETH tx | ✅ |
| Funding progress updates after investment | ✅ |
| Language toggle EN/ES (all strings translated) | ✅ |
| Sign-up name field + email verification UX | ✅ |
| User profile page | ⬜ next |
| Supabase schema (persistent storage) | ⬜ next |
| Real Bitso API (live keys) | ⬜ later |
| Smart contract deployment | ⬜ later |

---

## Quick Start

### Prerequisites
- Node.js ≥ 18
- Yarn ≥ 1.22
- Env vars (auto-loaded from `salasoliva27/dotfiles` in Codespaces):
  - `ANTHROPIC_API_KEY`
  - `SUPABASE_URL` + `SUPABASE_ANON_KEY`
  - `BITSO_API_KEY` + `BITSO_API_SECRET` (sandbox)

### Run

```bash
# Terminal 1 — backend (port 3001)
cd backend && yarn dev

# Terminal 2 — frontend (port 5173)
cd frontend && yarn dev
```

Frontend: http://localhost:5173  
Backend: http://localhost:3001

### Demo account
- Email: `demo@bosques.mx`
- Password: `bosques123`
- Or Google OAuth with any Google account

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS |
| Icons | Lucide React |
| Auth | Supabase (email/password + Google OAuth) |
| Backend | Node.js + Express + TypeScript |
| ORM | Prisma (PostgreSQL — optional, falls back to simulation) |
| AI | Anthropic Claude (`claude-sonnet-4-6`) |
| Investment | Bitso sandbox API (MXN → ETH quotes + simulated purchases) |
| i18n | Custom `src/lib/i18n.ts` (EN + ES, localStorage persistence) |

---

## Simulation Mode

When `SIMULATION_MODE=true` (default when no DB is available), the backend:
- Returns in-memory demo projects from `backend/src/data/simStore.ts`
- Records investments against the in-memory store (progress updates immediately)
- Skips all Prisma calls
- Generates fake tx hashes for Bitso purchases

This means the full UX is demonstrable without any infrastructure.

---

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for system diagram and data flows.

---

## Roadmap

See [ROADMAP.md](./ROADMAP.md) for planned phases.

---

## Legal

Espacio Bosques uses **Bitso** as the licensed IFPE (Institución de Fondos de Pago Electrónico) under Ley Fintech / CNBV. All MXN→ETH conversions go through Bitso's regulated infrastructure. No unlicensed exchange of value occurs on the platform itself.

---

**Built for the Bosques community, CDMX**
