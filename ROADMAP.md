# Roadmap — Espacio Bosques

## Current milestone: POC (April 2026)

Goal: a fully demoable simulation of the end-to-end user journey. No real contracts, no real money.

### POC status

| Feature | Status |
|---------|--------|
| Auth (Supabase email + Google OAuth) | ✅ Done |
| Landing page (EN/ES) | ✅ Done |
| Dashboard — project list with funding % | ✅ Done |
| Project detail — milestones, funding card | ✅ Done |
| AI blueprint creation | ✅ Done |
| Blueprint chat refinement loop | ✅ Done |
| Invest flow (Bitso quote + sim tx) | ✅ Done |
| Funding progress updates live after investment | ✅ Done |
| Full EN/ES i18n across all pages | ✅ Done |
| Sign-up name field + email verification UX | ✅ Done |
| Navbar: display name instead of email | ✅ Done |
| Create Project: simulation fallback (POST) | ✅ Done |

---

## Next: POC Polish (immediate)

- [ ] **User profile page** (`/profile`)
  - Name, email, avatar (initials fallback)
  - Investment history (all investments by this user)
  - Projects created
  - Option to update display name
- [ ] **Supabase persistent schema** — run SQL migrations for:
  - `bosques_profiles` (extends auth.users)
  - `bosques_projects`
  - `bosques_investments`
  - `bosques_milestones`
  - `bosques_disbursements`
  - `bosques_blueprint_sessions`
  - RLS policies on all tables
  - Seed `bosques_knowledge` from in-memory `KNOWLEDGE_BASE`
- [ ] **Wire create-project to persist** — after Supabase schema is live,
  `POST /api/projects` should write to `bosques_projects` (not just simStore)
- [ ] **Dashboard: real projects from Supabase** — `GET /api/projects` reads
  from `bosques_projects` table when DB is available

---

## Phase 2: Beta (1–2 months)

- [ ] **Real Bitso API** — switch from sandbox to production keys
- [ ] **Email notifications** — investment confirmation, project created,
  milestone approved (Resend or SendGrid)
- [ ] **Project evidence upload** — planners upload photos/CFDIs per milestone
  (Supabase Storage)
- [ ] **Community vote on milestones** — residents approve/reject milestone
  completion before funds release
- [ ] **Admin dashboard** — manage projects, approve planners, trigger
  disbursements
- [ ] **Push notifications** — resident gets notified when a project they funded
  hits a milestone

---

## Phase 3: Production (3–6 months)

- [ ] **Smart contract deployment** — deploy `EscrowVault.sol` to mainnet
  (Polygon for low gas fees)
- [ ] **Replace simulation with real escrow** — on-chain fund holding,
  milestone-gated release
- [ ] **CNBV/Ley Fintech compliance review** — legal sign-off before real money
  flows through the platform
- [ ] **KYC/AML** — resident identity verification for investments above
  legal threshold
- [ ] **Audit** — smart contract audit (Trail of Bits or equivalent)
- [ ] **Testnet run** — 30-day beta on Polygon Mumbai with real residents
- [ ] **Mainnet launch** — first real community project funded end-to-end

---

## Phase 4: Scale (6–12 months)

- [ ] **Multi-colonia support** — expand beyond Bosques de las Lomas
- [ ] **DAO governance** — token holders vote on platform parameters
- [ ] **Mobile app** — React Native (iOS + Android)
- [ ] **NFT proof-of-contribution** — commemorative tokens for investors and
  planners
- [ ] **IPFS evidence storage** — on-chain content addressing for milestone
  proofs

---

## Technical Debt

- [ ] Remove unused legacy auth route (`/api/auth` JWT login — predates Supabase)
- [ ] Fix pre-existing TypeScript errors in `drone_simulator.ts` and `auth.ts`
- [ ] Add `vite-env.d.ts` to resolve `ImportMeta.env` TS errors in frontend
- [ ] Remove unused `supabase` import in `ProjectDetail.tsx`
- [ ] Add proper error boundaries to frontend pages

---

## Out of scope (intentionally)

- ERC20 BOSQUES token — replaced by ETH escrow via Bitso
- MetaMask / wallet-connect — no crypto wallet required (fiat-first)
- PostgreSQL self-hosted — Supabase handles all data storage
- MinIO / IPFS (Phase 1–2) — Supabase Storage is sufficient for evidence files
