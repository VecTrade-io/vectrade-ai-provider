# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- **Test and docs drift** — align tests and README with the 16 tools and current API routes; remove the unused POST helper.
- **TypeScript exports** — place the `types` condition before runtime exports so package-aware resolvers can select declarations.

## [1.0.0] - 2026-05-29

### Changed

- **Stable release** — all public APIs finalized, semver enforced from this point

## [0.2.0] - 2026-05-29

### Added

- Multi-platform CI matrix (Node 18/20/22, macOS/Ubuntu/Windows)
- Live integration tests with authenticated API calls

### Changed

- **BREAKING:** Auth header changed to `X-API-Key` to match API gateway
- Updated provider tools to align with latest API endpoint paths

### Fixed

- Homepage URL corrected to docs.vectrade.io
- Regenerated lockfile to sync with package.json dependencies

## [0.1.0] - 2026-05-15

### Added

- Initial release of @vectrade/ai-provider
- Vercel AI SDK provider with 14 financial AI tools
- Tools: getQuote, getBatchQuotes, getFundamentals, getIncomeStatement, getBalanceSheet, getTechnicals, getNews, getAnalystRatings, runScreener, analyzeStock, compareStocks, getOptionsChain, getEarnings, getInsiderTransactions
- Automatic API key resolution from env var or options
- Custom base URL support
- Request timeout configuration
- Full TypeScript types with strict mode
- ESM and CJS dual-format output
- 100% test coverage (29 tests)

[Unreleased]: https://github.com/VecTrade-io/vectrade-ai-provider/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/VecTrade-io/vectrade-ai-provider/compare/v0.2.0...v1.0.0
[0.2.0]: https://github.com/VecTrade-io/vectrade-ai-provider/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/VecTrade-io/vectrade-ai-provider/releases/tag/v0.1.0
