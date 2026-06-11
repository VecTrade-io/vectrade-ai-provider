# @vectrade/ai-provider

[![CI](https://github.com/VecTrade-io/vectrade-ai-provider/actions/workflows/ci.yml/badge.svg)](https://github.com/VecTrade-io/vectrade-ai-provider/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@vectrade/ai-provider)](https://www.npmjs.com/package/@vectrade/ai-provider)
[![License](https://img.shields.io/github/license/VecTrade-io/vectrade-ai-provider)](LICENSE)
[![Node.js 18+](https://img.shields.io/badge/node-18+-green.svg)](https://nodejs.org/)
[![Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen)](https://github.com/VecTrade-io/vectrade-ai-provider)

VecTrade provider for [Vercel AI SDK](https://sdk.vercel.ai/) — use financial AI tools in any AI framework.

## Installation

```bash
npm install @vectrade/ai-provider ai
```

## Quick Start

```typescript
import { createVecTrade } from "@vectrade/ai-provider";
import { generateText } from "ai";

const vt = createVecTrade({ apiKey: process.env.VECTRADE_API_KEY });

const { text } = await generateText({
  model: yourModel,
  tools: vt.tools(),
  prompt: "What's AAPL trading at and what do analysts think?",
});
```

## Configuration

```typescript
import { createVecTrade } from "@vectrade/ai-provider";

const vt = createVecTrade({
  // Required: API key (or set VECTRADE_API_KEY env var)
  apiKey: "vq_live_...",

  // Optional: custom base URL (default: https://api.vectrade.io/v1)
  baseURL: "https://api.vectrade.io/v1",

  // Optional: request timeout in ms (default: 30000)
  timeout: 30_000,
});
```

## Available Tools

The provider exposes **16 VecTrade API endpoints** as AI-callable tools that
integrate seamlessly with the Vercel AI SDK:

### Market Data

| Tool | Description |
|------|-------------|
| `getQuote` | Real-time stock quote for a ticker |
| `getBatchQuotes` | Quotes for multiple symbols (max 50) |
| `getHistoricalPrices` | OHLCV price history |

### Fundamentals

| Tool | Description |
|------|-------------|
| `getFundamentals` | PE ratio, market cap, financials overview |
| `getFinancialStatements` | Income, balance sheet, cash flow statements |
| `getCompanyProfile` | Company information, sector, industry, exchange |

### Technical Analysis

| Tool | Description |
|------|-------------|
| `getTechnicals` | RSI, MACD, Bollinger Bands, etc. |

### News & Sentiment

| Tool | Description |
|------|-------------|
| `getNews` | Latest financial news, filterable by symbol |
| `getSentiment` | Social and news sentiment scoring |

### Analyst Research

| Tool | Description |
|------|-------------|
| `getAnalystRatings` | Analyst consensus ratings |
| `getAnalystTargets` | Analyst price targets (high/low/mean) |
| `getUpgradesDowngrades` | Recent analyst rating changes |

### Options & Events

| Tool | Description |
|------|-------------|
| `getOptionsChain` | Options chain by expiration |
| `getEarnings` | Earnings history and estimates |
| `getInsiderTransactions` | Insider buying/selling activity |

### ETF

| Tool | Description |
|------|-------------|
| `getETF` | ETF profile, NAV, and holdings |

## Usage Patterns

### Use All Tools

```typescript
const { text } = await generateText({
  model: yourModel,
  tools: vt.tools(),
  prompt: "Analyze the tech sector",
});
```

### Use Selected Tools

```typescript
const { text } = await generateText({
  model: yourModel,
  tools: vt.tools(["getQuote", "getAnalystRatings"]),
  prompt: "Summarize AAPL's price and analyst consensus",
});
```

### Use Individual Tools

```typescript
const quote = await vt.getQuote.execute(
  { symbol: "AAPL" },
  { toolCallId: "id", messages: [] },
);
```

### Streaming

```typescript
import { streamText } from "ai";

const stream = streamText({
  model: yourModel,
  tools: vt.tools(),
  prompt: "Give me a portfolio analysis",
});

for await (const chunk of stream.textStream) {
  process.stdout.write(chunk);
}
```

## Requirements

- Node.js 18+ (uses native `fetch`)
- VecTrade API key — [get one at vectrade.io](https://vectrade.io)
- `ai` package (Vercel AI SDK) as peer dependency

## Part of the VecTrade Ecosystem

| Package | Description |
|---------|-------------|
| [`vectrade`](https://github.com/VecTrade-io/vectrade-python) | Python SDK for VecTrade API |
| [`@vectrade/sdk`](https://github.com/VecTrade-io/vectrade-node) | TypeScript/Node SDK |
| [`vectrade-finkit`](https://github.com/VecTrade-io/finkit) | Financial computation library |
| [`@vectrade/ai-provider`](https://github.com/VecTrade-io/vectrade-ai-provider) | Vercel AI SDK provider (this package) |
| [`@vectrade/mcp`](https://github.com/VecTrade-io/vectrade-mcp) | Model Context Protocol server |

## Documentation

Full documentation is available at [docs.vectrade.io/sdks/ai-provider](https://docs.vectrade.io/sdks/ai-provider).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

MIT — see [LICENSE](LICENSE).
