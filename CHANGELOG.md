# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
