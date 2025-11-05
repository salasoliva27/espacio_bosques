# Roadmap

## Next 10 Priority Features/Security Items

### 1. **Multi-Signature Wallet Support** (High Priority)
Allow projects to use multi-sig wallets (Gnosis Safe) as planners for enhanced security.

### 2. **Real Stablecoin Integration** (Critical for Production)
Replace mock BOSQUES token with USDC/DAI integration. Update all contracts and UI.

### 3. **Professional Smart Contract Audit** (Security Critical)
Engage audit firm (Trail of Bits, ConsenSys Diligence, OpenZeppelin) before mainnet deploy.

### 4. **IPFS Pinning Service Integration** (Infrastructure)
Integrate Pinata or NFT.Storage for reliable evidence/metadata storage with automatic pinning.

### 5. **Email & Notification System** (User Experience)
Implement SendGrid for email notifications on project milestones, funding, validator votes.

### 6. **NFT Rewards for Contributors** (Gamification)
Mint commemorative NFTs for investors, planners, and validators. Track reputation on-chain.

### 7. **Advanced Governance with Proposals** (DAO Features)
Full proposal system where token holders vote on platform parameters, upgrades, and treasury allocation.

### 8. **Mobile App (React Native)** (Accessibility)
Native iOS/Android apps for browsing projects, investing, and receiving push notifications.

### 9. **Multi-Chain Deployment** (Scalability)
Deploy to Polygon, Arbitrum, Optimism for lower gas fees. Bridge BOSQUES token.

### 10. **Recurring Funding Campaigns** (New Feature)
Support subscription-style funding where backers commit monthly contributions to ongoing projects.

## Prioritized Development Phases

### Phase 1: MVP Hardening (Weeks 1-4)
- [ ] Complete unit test coverage (>90%)
- [ ] Integration tests for full user flows
- [ ] Load testing (k6 or Artillery)
- [ ] Security audit preparation docs
- [ ] Improve error handling & logging

### Phase 2: Production Readiness (Weeks 5-8)
- [ ] Smart contract audit & fixes
- [ ] Replace mock token with stablecoin
- [ ] Set up monitoring (Datadog/Sentry)
- [ ] Configure CI/CD pipelines
- [ ] Testnet deployment (Goerli/Sepolia)

### Phase 3: Enhanced Features (Weeks 9-16)
- [ ] IPFS pinning integration
- [ ] Email notifications
- [ ] Multi-sig wallet support
- [ ] Advanced search & filtering
- [ ] Project categories & tags

### Phase 4: DAO Governance (Weeks 17-24)
- [ ] Proposal creation & voting
- [ ] Treasury management
- [ ] Token distribution schedules
- [ ] Delegation system
- [ ] Governance dashboard

### Phase 5: Expansion (Weeks 25-36)
- [ ] NFT rewards system
- [ ] Mobile apps (iOS/Android)
- [ ] Multi-chain deployment
- [ ] Recurring funding campaigns
- [ ] Internationalization (10+ languages)

## Technical Debt

- Migrate from REST to GraphQL for more efficient data fetching
- Implement Redis caching layer
- Add database read replicas
- Refactor frontend state management to Zustand
- Optimize contract gas usage
- Add Subgraph for event indexing (The Graph)

## Research & Exploration

- Zero-knowledge proofs for private voting
- Chainlink oracles for real-world data (weather, IoT sensors)
- Decentralized identity (DID) for KYC
- Layer 2 rollup for lower fees
- Cross-chain messaging (LayerZero, Wormhole)

## Community Requests (Voting)

Track feature requests from community at https://github.com/salasoliva27/espacio_bosques/discussions
