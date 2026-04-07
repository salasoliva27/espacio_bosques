# LEGAL.md — Espacio Bosques
## Regulatory flags and compliance requirements
_Last reviewed: April 2026_

---

## Status: POC / Simulation only
No real money flows. All transactions are simulated. Legal requirements apply only when the platform goes live with real funds.

---

## 1. Ley Fintech (LRITF, 2018) — PRIMARY FLAG

### The risk: captación de recursos
Collecting MXN from multiple residents and holding it on the platform = **IFPE territory**.

**Institución de Fondos de Pago Electrónico (IFPE):** Any entity that receives, stores, or transmits electronic funds on behalf of users must be authorized by CNBV. Operating without authorization is a federal crime under Art. 18 of the Ley Fintech.

### The solution: Bitso as custodian (already architected)
- **Espacio Bosques NEVER holds MXN** — Bitso does
- Users fund their own Bitso accounts independently
- Espacio Bosques triggers investment transactions via Bitso API at the moment of investment
- Platform is a coordinator, not a custodian
- Bitso is a licensed IFPE — the legal liability stays with them

**Simulated balance** (current POC) represents what would be the user's Bitso MXN wallet balance in production. In production, `GET /api/balance/me` must proxy to `GET /v3/balance` on the Bitso API using the user's delegated OAuth token — platform never stores the balance itself.

---

## 2. Smart contract escrow — COLLECTIVE INVESTMENT FLAG

### The risk
Holding community funds in a smart contract ≈ collective investment scheme. CNBV regulates these under Ley de Fondos de Inversión. An unauthorized collective investment scheme is a serious regulatory violation.

### The solution: Asociación Civil as legal wrapper
- **Asociación Civil de Vecinos de Bosques de las Lomas (AC)** acts as the legal entity
- The AC is the contracting party for all projects — not individual residents
- Residents contribute to the AC (like HOA dues), not to a financial product
- The smart contract is the AC's treasury mechanism, not a fund
- All project contracts are signed by the AC's legal representative (Presidente)

**Required before production:**
- [ ] Formally constitute the AC (notario público, RFC, CLABE)
- [ ] AC opens Bitso business account for MXN custody
- [ ] Lawyer review of smart contract escrow structure
- [ ] CNBV no-objection letter or legal opinion confirming AC structure avoids IFPE/fund classification

---

## 3. Crowdfunding platform classification — FLAG

If Espacio Bosques is framed as a "crowdfunding" platform (which it resembles), it falls under **Instituciones de Financiamiento Colectivo (IFC)** regulation:

- IFCs require CNBV authorization
- Maximum MXN amounts per project apply
- Mandatory disclosure requirements
- Investor suitability rules

**Reframe to avoid IFC classification:** position as a neighborhood treasury tool operated by a registered AC — not a public crowdfunding platform. Access restricted to verified Bosques de las Lomas residents.

---

## 4. SAT — Tax implications

- ETH received by the AC from Bitso = asset acquisition → SAT declaration required
- MXN disbursements to contractors require CFDI 4.0 (factura)
- AC must maintain full expense records per milestone
- Residents' contributions to AC may be deductible if AC has DONATARIA authorization (unlikely initially)

---

## 5. Data privacy (LFPDPPP)

- Resident data (name, email, CLABE, investment amounts) = personal data
- Requires: privacy notice (Aviso de Privacidad), explicit consent
- INAI is the regulatory body
- Data retention policy needed
- **Action:** Add Aviso de Privacidad to registration flow before going live

---

## Immediate blockers before production launch

| # | Blocker | Owner | Unblocked by |
|---|---|---|---|
| 1 | Formally constitute Asociación Civil | Jano + lawyer | Notario appointment |
| 2 | Bitso business account for AC | Jano | AC RFC + legal docs |
| 3 | Legal review of smart contract escrow structure | Fintech lawyer | ~$5-15k MXN legal fee |
| 4 | CNBV no-objection or legal opinion | Lawyer | After AC + Bitso setup |
| 5 | Aviso de Privacidad (LFPDPPP) | Jano + lawyer | Template available in /modules/legal/ |
| 6 | CFDI 4.0 workflow for milestone disbursements | Jano | After AC has RFC |

---

## What is safe to do RIGHT NOW (POC/simulation)

- ✅ Full demo with simulated transactions (labeled as simulation)
- ✅ AI blueprint creation
- ✅ Supabase auth + user accounts
- ✅ Frontend, backend, smart contracts (testnet only)
- ✅ Pitch to residents and collect interest (no money)
- ❌ Collect real MXN from any resident
- ❌ Hold any user funds on the platform
- ❌ Deploy smart contracts on mainnet with real ETH

---

## Recommended path to production

1. Constitute AC → 2 weeks
2. Open Bitso business account → 1 week after AC
3. Bitso API integration (replace simStore with real Bitso API) → 2 weeks dev
4. Lawyer review → 2-4 weeks
5. Privacy notice + data consent flow → 1 week dev
6. Testnet → mainnet deploy (after legal clearance) → 1 week
7. Soft launch: invite-only, Bosques residents only, project cap $50k MXN

**Estimated time to legal production launch: 2-3 months with active legal engagement.**
