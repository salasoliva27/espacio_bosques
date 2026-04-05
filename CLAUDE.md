# ESPACIO BOSQUES — WORKSPACE BRAIN
## Workspace: espacio-bosques | Part of Janus IA

---

## WHO YOU ARE

Build agent for espacio-bosques — a blockchain community funding platform
for Bosques de las Lomas, CDMX. Part of the Janus IA portfolio.
Read janus-ia/CLAUDE.md for portfolio-level context and the dispatch protocol.

---

## PRODUCT

Espacio Bosques lets Bosques de las Lomas residents fund, monitor, and govern
community projects using on-chain escrow, AI project creation, and fiat payments.

Key design decision: users never touch a wallet or buy crypto themselves.
Bitso API (licensed IFPE under Ley Fintech) handles MXN → ETH conversion.
Backend custodial wallet executes on-chain transactions on behalf of users.
Auth: Supabase (email + PIN or Google OAuth). No MetaMask.

---

## SIMULATION MODE

SIMULATION_MODE=true in .env activates:
- Bitso sandbox API (fake MXN → fake ETH, zero real money)
- Hardhat local blockchain (fake BOSQUES tokens)
- Visible "SIMULACIÓN" banner in all UI
- Auto-generated backend wallet with fake ETH from Hardhat

SIMULATION_MODE=false = production. Never change without full review.

---

## STACK

Frontend:  React + Vite + TypeScript + Tailwind
Backend:   Node.js + Express + TypeScript
Contracts: Solidity 0.8.x + Hardhat
Auth:      Supabase Auth (email/PIN + Google OAuth)
Payments:  Bitso API (sandbox: api-dev.bitso.com | prod: api.bitso.com)
AI:        Claude claude-sonnet-4-20250514
Memory:    Shared Supabase + pgvector (janus-ia instance)
DB tables: Prefixed eb_ to avoid collision with other janus-ia projects

---

## CREDENTIALS — NEVER ASK FOR THESE

All keys in salasoliva27/dotfiles/.env. Full registry → janus-ia/CREDENTIALS.md
Required: ANTHROPIC_API_KEY · SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY
         BITSO_API_KEY · BITSO_API_SECRET · GOOGLE_CLIENT_ID · GOOGLE_CLIENT_SECRET

---

## SESSION BEHAVIOR

STEP 0 — Ask permission mode: 🟢 Full Auto | 🟡 Smart (default) | 🔴 Manual

STEP 1 — Session start:
1. recall("recent espacio-bosques work and decisions")
2. recall("janus-ia portfolio context")
3. Read this CLAUDE.md — note current build status
4. Check SIMULATION_MODE in .env
5. Respond to user

END OF SESSION:
remember(content="[summary]", workspace="espacio-bosques",
         project="espacio-bosques", type="session")

---

## BUILD STATUS

Contracts:
- ✅ ERC20 BOSQUES token, milestone escrow, validator voting, timelock, 22/22 tests
- ⬜ Sepolia deploy (after simulation validated)

Backend:
- ✅ Express API, Claude AI project creation, AI monitoring, Supabase
- ✅ Bitso service (fiat→crypto), custodial wallet service
- ✅ Investment route (replaces MetaMask flow)
- ✅ Supabase auth middleware
- ✅ Simulation mode config

Frontend:
- ✅ Dashboard, project detail, create project, AI reports
- ✅ SimulationBanner component
- ✅ AuthScreen (email/PIN + Google, no MetaMask)
- ✅ InvestModal (MXN amount → Bitso quote → confirm → tx hash)
- ⬜ Remove all remaining web3/MetaMask references

---

## LEGAL FLAG

Custodial crypto model is regulated under Ley Fintech / CNBV.
Using Bitso as licensed IFPE removes this risk for POC.
Do not accept real funds until legal structure validated with lawyer.
→ Flag for janus-ia/agents/core/legal.md when ready.
