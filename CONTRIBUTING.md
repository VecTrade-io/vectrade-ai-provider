# Contributing to @vectrade/ai-provider

Thank you for your interest in contributing!

## Development Setup

```bash
git clone https://github.com/VecTrade-io/vectrade-ai-provider.git
cd vectrade-ai-provider
npm install
```

## Running Tests

```bash
npm test
npm run test -- --coverage
```

## Code Style

We use ESLint 9 with TypeScript support:

```bash
npm run lint
```

## Build

```bash
npm run build
```

## Pull Request Process

1. Fork the repository and create a feature branch from `main`.
2. Add tests for any new functionality.
3. Ensure `npm test` passes with ≥90% coverage.
4. Ensure `npm run lint` and `npm run build` pass.
5. Update documentation if applicable.
6. Submit a pull request with a clear description.

## Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat: add new AI tool for portfolio analysis`
- `fix: handle timeout in API calls`
- `docs: update README examples`
- `test: add coverage for error paths`

## Code of Conduct

Be respectful and constructive. We follow the
[Contributor Covenant](https://www.contributor-covenant.org/) v2.1.
