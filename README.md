# @vectrade/ai-provider

[![License](https://img.shields.io/github/license/VecTrade-io/vectrade-ai-provider)](LICENSE) [![Node.js 18+](https://img.shields.io/badge/node-18+-green.svg)](https://nodejs.org/)

VecTrade provider for [Vercel AI SDK](https://sdk.vercel.ai/) — use financial AI tools in any AI framework.

## Installation

```bash
npm install @vectrade/ai-provider ai
```

## Quick Start

```typescript
import { createVecTrade } from "@vectrade/ai-provider";
import { generateText } from "ai";

const vectrade = createVecTrade({
  apiKey: process.env.VECTRADE_API_KEY,
});

const { text } = await generateText({
  model: vectrade("finance"),
  prompt: "Analyze AAPL's recent performance",
});
```

## Features

- Seamless integration with Vercel AI SDK's `generateText`, `streamText`, and `generateObject`
- Built-in financial data tools (quotes, analysis, screener)
- Streaming support for real-time responses
- TypeScript-first with full type safety

## Requirements

- Node.js 18+
- VecTrade API key ([get one](https://vectrade.io))
- `ai` package (Vercel AI SDK)

## Documentation

See the [full documentation](https://docs.vectrade.io/sdks/ai-provider) for detailed usage, tool definitions, and framework integration guides.

## License

MIT — see [LICENSE](LICENSE).
