# Architecture Documentation

## System Overview

Espacio Bosques is a three-tier web application combining React frontend, Node.js/Express backend, and Ethereum blockchain smart contracts.

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                         FRONTEND LAYER                            │
│   React 18 + Vite + TypeScript + Tailwind CSS + Wagmi           │
│                                                                    │
│   Components:                                                      │
│   ├── Navbar (wallet connection)                                 │
│   └── Pages                                                       │
│       ├── Landing                                                 │
│       ├── Dashboard (project list)                               │
│       ├── ProjectDetail (milestones, funding, telemetry)         │
│       ├── CreateProject (AI wizard)                              │
│       └── Reports (AI-generated insights)                        │
│                                                                    │
└────────────────┬─────────────────────────────────────────────────┘
                 │ HTTPS/REST API + JSON-RPC (Web3)
                 │
┌────────────────▼─────────────────────────────────────────────────┐
│                         BACKEND LAYER                             │
│      Node.js 18 + Express + TypeScript + Prisma ORM             │
│                                                                    │
│   API Routes:                                                     │
│   ├── /api/auth          (web3 signature login)                  │
│   ├── /api/projects      (CRUD operations)                       │
│   ├── /api/ai            (project creation, report generation)   │
│   ├── /api/simulate      (drone telemetry simulation)            │
│   └── /api/reports       (fetch AI reports)                      │
│                                                                    │
│   AI Integration:                                                 │
│   ├── project_creator.ts      (Anthropic Claude)                 │
│   ├── report_generator.ts     (Anthropic Claude)                 │
│   └── drone_simulator.ts      (mock IoT telemetry)               │
│                                                                    │
│   Event Listener:                                                 │
│   └── blockchain_sync.ts (syncs on-chain events to DB)           │
│                                                                    │
└────────┬───────────────────────┬──────────────────────────────────┘
         │                       │
         │ SQL                   │ JSON-RPC (ethers.js)
         │                       │
┌────────▼────────┐     ┌────────▼──────────────────────────────────┐
│   DATABASE      │     │        BLOCKCHAIN LAYER                    │
│   PostgreSQL 15 │     │   Hardhat + Solidity 0.8.20               │
│                 │     │                                             │
│   Tables:       │     │   Smart Contracts:                         │
│   - users       │     │   ┌──────────────────────────────────────┐ │
│   - projects    │     │   │ CommunityToken.sol (ERC20)           │ │
│   - milestones  │     │   │   - Mint, burn, transfer BOSQUES     │ │
│   - investments │     │   │   - Role: MINTER_ROLE                │ │
│   - telemetry   │     │   └──────────────────────────────────────┘ │
│   - reports     │     │   ┌──────────────────────────────────────┐ │
│   - events      │     │   │ ProjectRegistry.sol                  │ │
│                 │     │   │   - Create projects                  │ │
│   Indexes:      │     │   │   - Validator voting & approval      │ │
│   - wallet_addr │     │   │   - Role: PLANNER_ROLE, VALIDATOR_ROLE│ │
│   - project_id  │     │   └──────────────────────────────────────┘ │
│   - tx_hash     │     │   ┌──────────────────────────────────────┐ │
│                 │     │   │ EscrowVault.sol                      │ │
└─────────────────┘     │   │   - Deposit BOSQUES to projects     │ │
                        │   │   - Release request + voting         │ │
                        │   │   - Timelock enforcement             │ │
                        │   │   - Reentrancy protection            │ │
                        │   │   - Role: VALIDATOR_ROLE, ADMIN      │ │
                        │   └──────────────────────────────────────┘ │
                        │   ┌──────────────────────────────────────┐ │
                        │   │ MilestoneManager.sol                 │ │
                        │   │   - Create & track milestones        │ │
                        │   │   - Submit evidence (IPFS)           │ │
                        │   │   - Validator approval               │ │
                        │   └──────────────────────────────────────┘ │
                        │   ┌──────────────────────────────────────┐ │
                        │   │ Governance.sol                       │ │
                        │   │   - Role management                  │ │
                        │   │   - Proposal voting                  │ │
                        │   │   - Configuration updates            │ │
                        │   └──────────────────────────────────────┘ │
                        │   ┌──────────────────────────────────────┐ │
                        │   │ Reporting.sol                        │ │
                        │   │   - Anchor AI report hashes          │ │
                        │   │   - Emit on-chain events             │ │
                        │   └──────────────────────────────────────┘ │
                        └─────────────────────────────────────────────┘
```

## Data Flow

### Project Creation with AI

```
User → Frontend (CreateProject)
  → POST /api/ai/create-project { prompt }
    → Backend: project_creator.ts
      → Anthropic API (Claude 3.5 Sonnet)
        ← Returns: { title, summary, milestones[], monitoringHints[] }
      → Validates against schema
    ← Returns blueprint to frontend
  → User reviews & submits
→ POST /api/projects { ...blueprint, fundingGoal }
  → Backend: Creates project in Postgres
  → Backend: Calls ProjectRegistry.createProject()
    → Blockchain: Emits ProjectCreated event
      → Event listener syncs to DB
← Redirect to project detail page
```

### Funding Flow

```
User → Connect wallet (MetaMask)
  → Frontend: Approve BOSQUES token spending
    → CommunityToken.approve(escrowAddress, amount)
  → Frontend: Click "Fund This Project"
    → EscrowVault.deposit(projectId, amount)
      → Transfers tokens from user to escrow
      → Emits Deposited event
        → Backend event listener syncs to DB
← Frontend updates funding progress display
```

### Milestone Release Flow

```
Admin → Request release
  → Backend: EscrowVault.requestRelease(projectId, milestoneId, amount, recipient)
    → Creates ReleaseRequest with status=Pending
    → Emits ReleaseRequested event

Validators → Vote on release
  → EscrowVault.voteRelease(requestId, approved)
    → Increments approvalCount or rejectionCount
    → If quorum reached: status = Approved
    → Emits ReleaseVoteCast event

Wait for timelock (24 hours default)

Admin → Execute release
  → EscrowVault.executeRelease(requestId)
    → Checks: approved, timelock expired, sufficient balance
    → Transfers tokens to recipient
    → Emits ReleaseExecuted event
      → Backend syncs to DB
```

### AI Report Generation

```
User → ProjectDetail page → "View AI Reports"
  → Click "Generate New Report"
    → POST /api/ai/generate-report/:projectId
      → Backend: Fetches project + milestones + telemetry from DB
      → Backend: report_generator.ts
        → Analyzes telemetry for anomalies
        → Builds context (funding, milestones, recent events)
        → Sends to Anthropic API
          ← Returns: { title, summary, anomalies[], recommendations[] }
        → Stores report in Postgres
        → (Optional) Anchors hash on-chain via Reporting.sol
      ← Returns report to frontend
    → Frontend displays report with anomaly alerts
```

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18 | UI framework |
| | Vite | Build tool & dev server |
| | TypeScript | Type safety |
| | Tailwind CSS | Styling |
| | Wagmi | Ethereum wallet integration |
| | React Router | Client-side routing |
| | Axios | HTTP client |
| **Backend** | Node.js 18 | Runtime |
| | Express | Web framework |
| | TypeScript | Type safety |
| | Prisma | ORM for PostgreSQL |
| | Anthropic SDK | AI integration |
| | Ethers.js | Blockchain interaction |
| | Winston | Logging |
| **Blockchain** | Hardhat | Development environment |
| | Solidity 0.8.20 | Smart contract language |
| | OpenZeppelin | Security libraries |
| | Ethers.js | Contract interaction |
| **Database** | PostgreSQL 15 | Relational database |
| **Storage** | MinIO | S3-compatible object storage |
| | IPFS (Infura) | Decentralized file storage |
| **DevOps** | Docker | Containerization |
| | GitHub Actions | CI/CD |

## Security Architecture

### Authentication Flow

1. User connects wallet (MetaMask)
2. Frontend generates challenge message
3. User signs message with private key
4. Backend verifies signature using `ethers.verifyMessage`
5. Backend issues JWT token
6. Frontend includes JWT in Authorization header for subsequent requests

### Smart Contract Security

- **AccessControl**: Role-based permissions (ADMIN, VALIDATOR, PLANNER, REPORTER)
- **ReentrancyGuard**: Prevents reentrancy attacks on fund transfers
- **SafeERC20**: Safe token transfer wrappers
- **Timelock**: 24-hour delay on fund releases
- **Quorum**: Requires 51% validator approval by default

### API Security

- Rate limiting: 100 requests per 15 minutes per IP
- CORS: Restricted to frontend origin
- Helmet: Security headers
- Input validation: Zod schemas
- JWT expiration: 7 days

## Scalability Considerations

### Current Limitations

- Single PostgreSQL instance
- In-memory rate limiting (not distributed)
- No caching layer
- Frontend API calls not optimized (no React Query cache)

### Recommended for Production

1. **Database**: Read replicas + connection pooling (PgBouncer)
2. **Caching**: Redis for API responses + session storage
3. **CDN**: CloudFlare for static assets
4. **Load Balancer**: Nginx or AWS ALB for backend
5. **Monitoring**: Datadog or New Relic for APM
6. **Queue**: Bull/BullMQ for background jobs (event processing, report generation)

## Configuration Management

Configuration is centralized in `config/project-config.json` and read by both backend and contracts:

```json
{
  "governance": { "quorumPercentage": 51, "timelockDelayHours": 24 },
  "ai": { "anomalyThresholds": { "uptimeMinPercent": 95, ... } },
  "funding": { "minProjectFunding": "100", "maxProjectFunding": "100000" }
}
```

## Deployment Architecture (Production)

```
           Internet
              │
         ┌────▼────┐
         │   CDN   │ (CloudFlare)
         │ + WAF   │
         └────┬────┘
              │
         ┌────▼────────┐
         │ Load        │
         │ Balancer    │
         └──┬──────┬───┘
            │      │
    ┌───────▼──┐ ┌▼────────┐
    │ Frontend │ │ Backend │ (Auto-scaling group)
    │ (Static) │ │ (Node)  │
    └──────────┘ └┬───┬────┘
                  │   │
           ┌──────▼┐  └──▼────────┐
           │ RDS   │     │ Redis  │
           │(Postgres)   │(Cache) │
           └───────┘     └────────┘
```

## Monitoring & Observability

Recommended metrics to track:

- **Frontend**: Page load time, API response time, error rate
- **Backend**: Request rate, response time, error rate, queue depth
- **Blockchain**: Gas usage, transaction success rate, event sync lag
- **AI**: API latency, token usage, error rate, prompt/response quality
- **Database**: Query performance, connection pool usage, replication lag

## Assumptions & Trade-offs

See [ASSUMPTIONS.md](./ASSUMPTIONS.md) for detailed discussion of design decisions.
