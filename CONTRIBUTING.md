# Contributing to Espacio Bosques

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Code of Conduct

Be respectful, inclusive, and professional. We welcome contributors of all backgrounds and experience levels.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/espacio_bosques.git`
3. Create a branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Test thoroughly
6. Commit with clear messages
7. Push and create a pull request

## Development Setup

```bash
# Install dependencies
yarn install

# Start development environment
yarn start:eth       # Terminal 1: Hardhat node
yarn deploy:local    # Terminal 2: Deploy contracts
yarn seed            # Terminal 3: Seed database
yarn start:dev       # Terminal 4: Backend + Frontend
```

## Commit Messages

Follow conventional commits format:

```
feat: add NFT rewards system
fix: resolve escrow reentrancy vulnerability
docs: update architecture diagram
test: add coverage for MilestoneManager
chore: upgrade dependencies
```

## Pull Request Process

1. Ensure all tests pass: `yarn test`
2. Update documentation if needed
3. Add tests for new features
4. Request review from maintainers
5. Address feedback promptly

## Areas to Contribute

### High Priority
- Smart contract security improvements
- Test coverage expansion
- Documentation improvements
- Bug fixes

### Medium Priority
- Frontend UX enhancements
- Backend API optimizations
- Internationalization (i18n)
- Accessibility improvements

### Ideas Welcome
- New AI features
- Monitoring dashboards
- Mobile app (React Native)
- Integration with other protocols

## Code Style

### TypeScript/JavaScript
- Use Prettier (configured in .prettierrc)
- ESLint rules enforced
- Prefer functional components (React)
- Use TypeScript types (no `any`)

### Solidity
- Follow Solidity style guide
- Use NatSpec comments
- Prefer OpenZeppelin libraries
- Gas optimization secondary to readability

### Testing
- Unit tests for all new functions
- Integration tests for user flows
- Test both happy and error paths
- Aim for >80% coverage

## Documentation

- Update README.md for user-facing changes
- Update ARCHITECTURE.md for design changes
- Add inline comments for complex logic
- Include examples in docstrings

## Security

- Never commit private keys or secrets
- Report vulnerabilities privately to security@espacio-bosques.org
- Add tests for security-critical code
- Follow OWASP guidelines

## Questions?

- Open a GitHub Discussion
- Join our Discord (link TBD)
- Email: community@espacio-bosques.org

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
