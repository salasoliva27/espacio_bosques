# TOOLS — espacio-bosques
## Tools declared for this project

> Tools and skills are managed centrally in the venture-os master registry.
> For discovery protocol, verdicts, and install commands: see venture-os/TOOLS.md and venture-os/learnings/mcp-registry.md

This file declares which tools this project uses. For credential setup, key rotation, and "where to find" guides → see **[venture-os/CREDENTIALS.md](../venture-os/CREDENTIALS.md)**.

Never manage credentials here. All secrets live in `salasoliva27/dotfiles`.

---

## TOOLS IN USE

| Tool | MCP Server | Used for |
|---|---|---|
| GitHub | `github` | Code push, PR management |
| Brave Search | `brave-search` | Blockchain regulation research (CNBV), competitor platform analysis |
| Google Workspace | `google-workspace` | Drive (legal docs, investor materials), Gmail (resident/investor threads), Sheets (cap table, financials) |
| Filesystem | `filesystem` | Local file R/W during builds |
| Fetch | `fetch` | RPC calls to Sepolia testnet, Alchemy API, blockchain data |
| Sequential Thinking | `sequential-thinking` | Smart contract audit reasoning, multi-step legal/regulatory analysis |

## TOOLS NOT NEEDED (excluded with reason)

| Tool | Reason excluded |
|---|---|
| Cloudflare | No media storage needed at current stage. Revisit if frontend needs CDN. |
| n8n | No automation pipeline at current stage. Potential future use: on-chain event → notification workflow. |
| Playwright | Not applicable. |

---

## CREDENTIAL CHECK

Run the check from venture-os before any Claude Code session on this project:

```bash
# From any terminal in this Codespace:
cd /workspaces/venture-os && cat CREDENTIALS.md
# Or run the live check script from CREDENTIALS.md
```

**Minimum required for this project to function:**
- `GITHUB_TOKEN` (push code)
- `BRAVE_API_KEY` (CNBV regulatory research)
- `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` + OAuth flow (Drive for legal docs and investor materials)

**Blockchain-specific credentials** (managed in `.env` local to this repo, NOT in Claude Code):
- `PRIVATE_KEY` — MetaMask wallet for contract deployment (in `.env`, gitignored)
- `ALCHEMY_API_KEY` or `SEPOLIA_RPC_URL` — Sepolia RPC endpoint (in `.env`, gitignored)
- `ETHERSCAN_API_KEY` — contract verification on Etherscan (in `.env`, gitignored)

These are NOT loaded through dotfiles into Claude Code because they are deployment keys, not MCP tool keys. They live in this repo's `.env` file which is gitignored.

---

## STORAGE ROUTING

| Content | Where |
|---|---|
| Smart contracts, frontend, backend code | This repo (GitHub) |
| Legal filings, CNBV correspondence | Google Drive: `/VentureOS/espacio-bosques/legal/` |
| Investor materials, pitch deck | Google Drive: `/VentureOS/espacio-bosques/investors/` |
| Cap table, financial model | Google Drive (Sheets): `/VentureOS/espacio-bosques/finances/` |
| Deployed contract addresses | `config/` folder in this repo |
