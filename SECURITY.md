# Security Policy

## Reporting a Vulnerability

**DO NOT** open a public GitHub issue for security vulnerabilities.

Instead, please email: security@espacio-bosques.org (or create private security advisory on GitHub)

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will respond within 48 hours and provide a timeline for remediation.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Security Measures

### Smart Contracts
- ✅ OpenZeppelin battle-tested libraries (AccessControl, ReentrancyGuard, SafeERC20)
- ✅ Role-based access control (ADMIN, VALIDATOR, PLANNER, REPORTER)
- ✅ Reentrancy protection on fund transfers
- ✅ Timelock on fund releases (default 24 hours)
- ✅ Quorum voting for validator approvals
- ✅ No delegatecall or selfdestruct
- ✅ Events emitted for all state changes
- ⚠️  **NEEDS AUDIT**: Not yet professionally audited

### Backend API
- ✅ Rate limiting (100 req/15min per IP)
- ✅ CORS restricted to frontend origin
- ✅ Helmet.js security headers
- ✅ Input validation with Zod schemas
- ✅ JWT authentication with expiration
- ✅ Parameterized SQL queries (Prisma)
- ✅ Secrets in environment variables (not in code)
- ⚠️  **TODO**: Implement refresh tokens
- ⚠️  **TODO**: Add request signing for sensitive operations

### Frontend
- ✅ No secrets in client code
- ✅ CSP headers via Helmet
- ✅ XSS protection (React auto-escaping)
- ✅ Wallet signature verification
- ⚠️  **TODO**: Implement transaction simulation before signing

### Infrastructure
- ✅ PostgreSQL with SSL
- ✅ MinIO with access keys
- ⚠️  **TODO**: Secrets management (Vault, AWS Secrets Manager)
- ⚠️  **TODO**: Network segmentation
- ⚠️  **TODO**: WAF for DDoS protection

## Known Limitations

1. **Mock Token**: BOSQUES is a test token, not production-ready
2. **No KYC**: Stub implementation only
3. **Centralized Backend**: Single point of failure
4. **No Formal Audit**: Contracts have not been audited
5. **Local Hardhat**: Not battle-tested on mainnet

## Security Checklist Before Production

- [ ] Professional smart contract audit (mandatory)
- [ ] Penetration testing of backend API
- [ ] Bug bounty program (Immunefi, HackerOne)
- [ ] Secrets management setup (Vault/AWS)
- [ ] DDoS protection (CloudFlare)
- [ ] Monitoring & alerting (Sentry, Datadog)
- [ ] Incident response plan
- [ ] Insurance coverage (Nexus Mutual)
- [ ] Legal compliance review
- [ ] Disaster recovery plan

## Past Security Issues

None yet (project in development).

## Disclosure Policy

We follow coordinated disclosure:
1. Researcher reports vulnerability privately
2. We confirm and develop fix (target: 30 days)
3. We deploy fix to production
4. We publish security advisory
5. We credit researcher (if desired)

## Security Best Practices for Users

- ✅ Always verify contract addresses
- ✅ Never share private keys or seed phrases
- ✅ Use hardware wallets for large amounts
- ✅ Double-check transaction details before signing
- ✅ Enable 2FA on all accounts
- ✅ Keep software up to date
- ⚠️  Be cautious of phishing attacks

## Bug Bounty

Coming soon after audit completion.

## Contact

- Email: security@espacio-bosques.org
- GitHub Security Advisories: https://github.com/salasoliva27/espacio_bosques/security/advisories
