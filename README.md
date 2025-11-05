# Espacio Bosques (Bosques DAO)

**Community Funding Platform with AI-Assisted Project Creation and On-Chain Escrow**

Espacio Bosques empowers communities to create, fund, and monitor impactful projects using AI-powered planning (Anthropic Claude), transparent blockchain escrow (Solidity + Hardhat), and automated monitoring with real-time reporting.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🚀 Quick Start

### Prerequisites

- Node.js ≥ 18
- Yarn ≥ 1.22
- Supabase account (free tier works) OR PostgreSQL 15

### Installation

```bash
# Clone repository
git clone https://github.com/salasoliva27/espacio_bosques.git
cd espacio_bosques

# Install dependencies
yarn install

# Copy environment file and configure
cp .env.example .env
# Edit .env and add:
# - Your ANTHROPIC_API_KEY
# - Your Supabase DATABASE_URL
```

### Configuration

**REQUIRED:** Configure `.env` with:

1. **Anthropic API key** (get from https://console.anthropic.com/):
```bash
ANTHROPIC_API_KEY=sk-ant-api03-YOUR_KEY_HERE
```

2. **Supabase DATABASE_URL** (get from your Supabase project dashboard):
```bash
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@YOUR_HOST.supabase.co:5432/postgres?schema=public
```

### Running Locally (Step-by-Step)

#### Terminal 1: Start Hardhat Node

```bash
yarn start:eth
# Hardhat network running at http://localhost:8545
```

#### Terminal 2: Deploy Contracts

```bash
yarn deploy:local
# Deploys all contracts and funds test accounts
# Writes addresses to .env.local
```

#### Terminal 3: Start Backend

```bash
cd backend
yarn prisma:migrate
yarn seed
yarn dev
# Backend running at http://localhost:3001
```

#### Terminal 4: Start Frontend

```bash
cd frontend
yarn dev
# Frontend running at http://localhost:5173
```

## 🎯 Demo: Drone Vigilance Scenario

This walkthrough demonstrates the complete lifecycle of an AI-assisted community project.

### Step 1: View Existing Projects

```bash
# Open browser
open http://localhost:5173/dashboard

# You'll see 2 seeded projects:
# 1. Bosques Forest Drone Vigilance (ACTIVE, with telemetry)
# 2. Los Bosques Community Organic Garden (APPROVED)
```

### Step 2: Explore Drone Project

Click on "Bosques Forest Drone Vigilance" to view:
- 4 milestones (1 completed, 1 in progress, 2 pending)
- 30,000 BOSQUES raised of 50,000 goal (60%)
- Live telemetry: uptime 98%, battery 75%
- Recent investments from community members

### Step 3: Generate AI Report

```bash
# Click "View AI Reports" button
# Click "Generate New Report"

# AI analyzes:
# - Project telemetry (30 simulated drone events)
# - Milestone progress
# - Funding status
# - Detect anomalies (low battery, offline status, etc.)

# Report includes:
# - Overall health summary
# - Anomaly alerts with severity levels
# - Milestone assessments
# - Actionable recommendations
```

### Step 4: Simulate More Telemetry

```bash
curl -X POST http://localhost:3001/api/simulate/drone/<PROJECT_ID>
```

### Step 5: Create New Project with AI

Go to http://localhost:5173/create and enter a prompt:

"Create a solar panel installation project for our community center. We need to install 50kW of solar panels, connect to grid, train staff, and monitor energy production. Budget is around 30,000 BOSQUES."

AI creates structured project with milestones, funding percentages, and monitoring hints.

### Step 6: Test Contract Functions

```bash
cd contracts
npx hardhat test
# Runs comprehensive tests covering happy paths and edge cases
```

## 📚 Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed design diagrams.

## 🔑 Key Features

### 1. AI-Assisted Project Creation
- Natural language input → Structured project blueprint
- Anthropic Claude 3.5 Sonnet generates milestones, funding percentages, and monitoring hints
- Validation against configurable schema

### 2. On-Chain Escrow with Governance
- ERC20 token funding (BOSQUES)
- Milestone-based fund releases with validator voting
- Timelock & quorum enforcement
- Reentrancy protection & role-based access control

### 3. AI Monitoring & Reporting
- Automated telemetry analysis & anomaly detection
- Milestone progress tracking
- On-chain report anchoring

### 4. Membership & Identity
- Web3 wallet signature login
- Pluggable KYC adapter

## 🧪 Testing

```bash
# Contract tests
yarn test

# Backend tests
cd backend && yarn test

# E2E tests
cd frontend && yarn e2e
```

## 🔐 Security

- OpenZeppelin contracts (AccessControl, ReentrancyGuard, SafeERC20)
- Comprehensive test coverage
- See [SECURITY.md](./SECURITY.md) and [AUDIT_README.md](./AUDIT_README.md)

## 🔄 Switching from Anthropic to Another LLM

The AI integration is modular. To replace Anthropic Claude:

1. Create new adapter in `backend/src/ai/adapters/your-llm.ts`
2. Implement same interface (createProjectWithAI, generateReport)
3. Update imports in `backend/src/routes/ai.ts`
4. Configure credentials in `.env`

Example for OpenAI GPT-4:
```typescript
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
// Use same interface for consistency
```

## 🛣️ Roadmap

See [ROADMAP.md](./ROADMAP.md) for planned features.

## 📜 License

MIT License - See [LICENSE](./LICENSE)

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md)

---

**Built with ❤️ for the Bosques community**
