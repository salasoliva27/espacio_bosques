# Assumptions & Design Decisions

## Technical Assumptions

### Blockchain
- **Local development only**: Hardhat node sufficient for demo, not production-ready
- **Mock ERC20 token**: BOSQUES is for testing; production should use USDC/DAI
- **No gas optimization**: Prioritized readability over gas efficiency
- **Role centralization**: Single admin for MVP; migrate to DAO governance later
- **Fixed quorum**: 51% validator approval hardcoded; should be configurable

### AI Integration
- **Anthropic API available**: Requires developer to provide API key
- **English prompts**: AI project creation optimized for English input
- **Structured output**: Assumes AI returns valid JSON (validated, but may fail)
- **Rate limits**: No built-in throttling for Anthropic API calls
- **Deterministic output**: AI responses may vary; validation ensures schema compliance

### Backend
- **Single instance**: No horizontal scaling considered for MVP
- **PostgreSQL only**: No multi-database support
- **In-memory rate limiting**: Not distributed across instances
- **JWT stateless**: No session management or refresh tokens
- **No caching layer**: Direct database queries on every request

### Frontend
- **Modern browsers only**: ES2020 features, no IE11 support
- **MetaMask assumed**: Primary wallet, WalletConnect planned but not implemented
- **English UI**: Localization strings provided but not fully wired
- **Desktop-first**: Mobile responsive but not optimized for mobile UX

## Business Assumptions

### Users
- **Technical literacy**: Users understand wallets, gas fees, blockchain basics
- **Trust in validators**: Validator role assumed honest (no slashing)
- **Community size**: Designed for 100-1000 projects, not millions
- **KYC optional**: Pseudonymous by default; KYC only for specific use cases

### Projects
- **Funding in BOSQUES**: All projects denominated in same token
- **Linear milestones**: Sequential milestone completion assumed
- **Evidence on IPFS**: Project evidence stored off-chain with on-chain hash
- **Milestone percentages sum to 100%**: Enforced in AI generation and validation

### Governance
- **Validator honesty**: No slashing or reputation system yet
- **Admin trust**: DEFAULT_ADMIN_ROLE has emergency powers
- **Timelock sufficient**: 24-hour delay deemed adequate for security
- **Quorum fixed**: 51% approval rate not configurable per project

## Security Assumptions

- **OpenZeppelin libraries secure**: Trust battle-tested code
- **Reentrancy protection sufficient**: NonReentrant modifier prevents attacks
- **Private keys secure**: Users responsible for key management
- **Backend server trusted**: Centralized backend not Byzantine-fault-tolerant
- **Database secure**: PostgreSQL assumed configured correctly

## Scalability Assumptions

- **Low transaction volume**: <1000 tx/day for MVP
- **Single region deployment**: No CDN or multi-region for demo
- **Manual database backups**: Automated backups not configured
- **No load balancing**: Single backend instance sufficient for testing

## Integration Assumptions

### IPFS
- **Infura gateway available**: Assumes free tier sufficient
- **Content persistence**: Relies on Infura pinning; no redundancy
- **Upload success**: No retry logic for failed uploads

### MinIO
- **Development only**: Not configured for production S3
- **No encryption**: Files stored unencrypted in local MinIO
- **Single bucket**: No bucket policies or access controls

## UX Assumptions

- **English-speaking users**: Primary language for demo
- **Wallet installed**: Users have MetaMask or similar before visiting site
- **Desktop usage**: Mobile UX not optimized
- **Network connectivity**: Always online; no offline mode

## Data Model Assumptions

- **Wallet address as identifier**: No email login or social auth
- **One wallet per user**: No multi-wallet support
- **Project uniqueness**: Project IDs assumed globally unique
- **No soft deletes**: Records deleted permanently (or not at all)

## Testing Assumptions

- **Manual testing sufficient**: No automated E2E tests for all user flows
- **Hardhat test accounts**: Uses default test private keys (insecure for prod)
- **Contract tests comprehensive**: Assumed to cover critical paths
- **No load testing**: Performance under load not validated

## Deployment Assumptions

- **Manual deployment**: No automated CI/CD for MVP
- **Single environment**: Dev and prod not separated
- **No monitoring**: Logs not centralized; no APM
- **No secrets rotation**: API keys assumed static

## Future Considerations

These assumptions will be revisited and addressed in future phases:

1. **Multi-chain**: Currently single-chain (Hardhat), expand to Polygon, Arbitrum
2. **Decentralized backend**: Migrate to IPFS + The Graph for full decentralization
3. **Advanced governance**: Token-weighted voting, delegation, proposals
4. **Mobile-first**: React Native apps for iOS/Android
5. **Enterprise features**: Private projects, custom branding, white-label

## Trade-offs Made

| Decision | Rationale | Future Plan |
|----------|-----------|-------------|
| Mock token | Faster development, no real funds at risk | Replace with USDC/DAI |
| Centralized backend | Simpler for MVP, faster iteration | Migrate to The Graph + IPFS |
| Single-language UI | Faster development | Add i18n with 10+ languages |
| No KYC | Privacy-first, lower barrier to entry | Pluggable KYC for regulated use cases |
| PostgreSQL only | Mature, well-known, easy to debug | Consider NoSQL for telemetry data |
| REST API | Simple, standard, easy to document | GraphQL for more efficient data fetching |

## Non-Goals (Out of Scope for MVP)

- ❌ Mobile apps (React Native)
- ❌ NFT rewards
- ❌ Multi-chain support
- ❌ Fiat on/off ramps
- ❌ Advanced analytics dashboard
- ❌ Social features (comments, likes, follows)
- ❌ Private/permissioned projects
- ❌ Recurring subscriptions
- ❌ Token swaps / DEX integration
