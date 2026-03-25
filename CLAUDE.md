# ESPACIO BOSQUES — WORKSPACE BRAIN
## Workspace: espacio-bosques | Part of Venture OS

---

## WHO YOU ARE

You are the build agent for espacio-bosques — a blockchain-based community investment platform for Bosques de las Lomas residents. You operate within the Venture OS portfolio managed from `salasoliva27/venture-os`. Read that repo for portfolio-level context.

---

## THIS WORKSPACE

- **Workspace name:** `espacio-bosques` (use this in all memory calls)
- **Repo:** github.com/salasoliva27/espacio_bosques
- **Product:** Blockchain investment platform — residents pool capital into community improvement projects, governed by smart contracts
- **Target market:** Bosques de las Lomas residents + local service providers
- **Key legal flag:** Blockchain-based investment → potential CNBV regulatory territory → validate before real funds

---

## CODEBASE STRUCTURE

```
contracts/          ← Solidity smart contracts (22/22 tests passing)
frontend/           ← React + TypeScript (5 pages)
backend/            ← Node.js/Express + Prisma/Supabase
config/             ← Deployed contract addresses, network configs
```

---

## CREDENTIALS — NEVER ASK FOR THESE

All keys are in `salasoliva27/dotfiles/.env` and auto-load into every Codespace.

**Full credential registry and "where to find" guide → [`venture-os/CREDENTIALS.md`](../venture-os/CREDENTIALS.md)**

**Blockchain deployment keys** (separate from MCP tools — live in `.env` in this repo, gitignored):
- `PRIVATE_KEY` — MetaMask wallet for contract deployment
- `SEPOLIA_RPC_URL` or `ALCHEMY_API_KEY` — Sepolia testnet RPC
- `ETHERSCAN_API_KEY` — contract verification

Which tools this project needs → [`TOOLS.md`](./TOOLS.md)

---

## SESSION BEHAVIOR — READ THIS FIRST

**This workspace is: `espacio-bosques`**

Every time a chat opens — regardless of what the user says first — you MUST do the following before composing any response:

### STEP 0 — PERMISSION MODE (ask this before anything else, every single session)

Before recalling memory, ask Jano:

---
**🔐 Permission mode for this session?**
**🟢 Full Auto** — everything without interruptions | **🟡 Smart** *(default)* — safe ops auto, confirm before push/delete/destructive | **🔴 Manual** — ask before each action

---

Wait for answer, then proceed. Full permission mode definitions → `venture-os/CLAUDE.md`

### STEP 1 — AUTOMATIC SESSION START (do this right after getting permission mode)
1. Call `recall("recent espacio-bosques work and decisions")` — gets this project's memory
2. Call `recall("venture-os portfolio context")` — loads cross-project context
3. Read this CLAUDE.md build status section — understand current state
4. You now have full context. Respond to whatever the user asked.

### END OF EVERY SESSION
Before the conversation ends, call `remember()` — even if the user doesn't ask:
```
remember(
  content="[summary: what was built, decisions made, open questions, next steps]",
  workspace="espacio-bosques",
  project="espacio-bosques",
  type="session"
)
```

---

## BUILD STATUS

- ✅ Smart contracts — 22/22 tests passing (local hardhat)
- ✅ Sepolia config added — hardhat.config.ts + deploy-sepolia.ts
- ✅ React frontend exists (5 pages)
- ✅ Node/Express backend with Prisma/Supabase
- ⬜ Sepolia deployment — blocked on testnet ETH (see faucet guide in venture-os/CREDENTIALS.md)
- ⬜ Frontend → blockchain integration
- ⬜ CNBV legal review before mainnet

---

## TOOLS FOR THIS PROJECT

Declared tool list and storage routing → [`TOOLS.md`](./TOOLS.md)

Blockchain tooling: `npx hardhat` for compile/test/deploy
