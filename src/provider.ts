import { tool } from "ai";
import { z } from "zod";

export interface VecTradeProviderOptions {
  /** API key. Defaults to VECTRADE_API_KEY env var. */
  apiKey?: string;
  /** Custom base URL. */
  baseURL?: string;
  /** Request timeout in milliseconds. Default: 30000. */
  timeout?: number;
}

// ── Internal helpers ──────────────────────────────────────────────────

function resolveConfig(options: VecTradeProviderOptions) {
  const apiKey = options.apiKey ?? process.env.VECTRADE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "VecTrade API key is required. Pass apiKey option or set VECTRADE_API_KEY env var.",
    );
  }
  const baseURL = (options.baseURL ?? "https://api.vectrade.io/v1").replace(
    /\/$/,
    "",
  );
  const timeout = options.timeout ?? 30_000;
  return { apiKey, baseURL, timeout };
}

async function apiGet(
  baseURL: string,
  apiKey: string,
  path: string,
  params?: Record<string, string>,
  timeout?: number,
): Promise<unknown> {
  const url = new URL(`${baseURL}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: timeout ? AbortSignal.timeout(timeout) : undefined,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`VecTrade API error ${res.status}: ${body}`);
  }
  return res.json();
}

async function apiPost(
  baseURL: string,
  apiKey: string,
  path: string,
  body: Record<string, unknown>,
  timeout?: number,
): Promise<unknown> {
  const res = await fetch(`${baseURL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: timeout ? AbortSignal.timeout(timeout) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`VecTrade API error ${res.status}: ${text}`);
  }
  return res.json();
}

// ── Public API ────────────────────────────────────────────────────────

/**
 * Create a VecTrade AI provider with financial tools for the Vercel AI SDK.
 *
 * @example
 * ```ts
 * import { createVecTrade } from "@vectrade/ai-provider";
 * import { generateText } from "ai";
 *
 * const vt = createVecTrade({ apiKey: "vq_live_..." });
 *
 * const result = await generateText({
 *   model: yourModel,
 *   tools: vt.tools(),
 *   prompt: "What's AAPL trading at?",
 * });
 * ```
 */
export function createVecTrade(options: VecTradeProviderOptions = {}) {
  const { apiKey, baseURL, timeout } = resolveConfig(options);

  // ── Quotes & Market Data ──

  const getQuote = tool({
    description: "Get a real-time stock quote for a given ticker symbol",
    parameters: z.object({
      symbol: z.string().describe("Stock ticker symbol (e.g., AAPL)"),
    }),
    execute: async ({ symbol }) =>
      apiGet(baseURL, apiKey, `/vq/quotes/${encodeURIComponent(symbol)}`, undefined, timeout),
  });

  const getBatchQuotes = tool({
    description: "Get real-time quotes for multiple symbols in one call",
    parameters: z.object({
      symbols: z
        .array(z.string())
        .min(1)
        .max(50)
        .describe("Array of ticker symbols (max 50)"),
    }),
    execute: async ({ symbols }) =>
      apiGet(baseURL, apiKey, "/vq/quotes/batch", { symbols: symbols.join(",") }, timeout),
  });

  // ── Fundamentals ──

  const getFundamentals = tool({
    description: "Get fundamental financial data for a company (PE, market cap, etc.)",
    parameters: z.object({
      symbol: z.string().describe("Stock ticker symbol"),
    }),
    execute: async ({ symbol }) =>
      apiGet(baseURL, apiKey, `/vq/fundamentals/${encodeURIComponent(symbol)}`, undefined, timeout),
  });

  const getIncomeStatement = tool({
    description: "Get income statement data (revenue, earnings, margins)",
    parameters: z.object({
      symbol: z.string().describe("Stock ticker symbol"),
      period: z
        .enum(["annual", "quarterly"])
        .default("annual")
        .describe("Reporting period"),
    }),
    execute: async ({ symbol, period }) =>
      apiGet(
        baseURL,
        apiKey,
        `/vq/fundamentals/${encodeURIComponent(symbol)}/income-statement`,
        { period },
        timeout,
      ),
  });

  const getBalanceSheet = tool({
    description: "Get balance sheet data (assets, liabilities, equity)",
    parameters: z.object({
      symbol: z.string().describe("Stock ticker symbol"),
      period: z
        .enum(["annual", "quarterly"])
        .default("annual")
        .describe("Reporting period"),
    }),
    execute: async ({ symbol, period }) =>
      apiGet(
        baseURL,
        apiKey,
        `/vq/fundamentals/${encodeURIComponent(symbol)}/balance-sheet`,
        { period },
        timeout,
      ),
  });

  // ── Technical Analysis ──

  const getTechnicals = tool({
    description:
      "Get technical indicators (RSI, MACD, Bollinger Bands, etc.) for a stock",
    parameters: z.object({
      symbol: z.string().describe("Stock ticker symbol"),
      indicators: z
        .string()
        .optional()
        .describe("Comma-separated indicators (e.g., rsi,macd,bollinger)"),
      interval: z
        .enum(["1d", "1h", "15m", "5m"])
        .default("1d")
        .describe("Time interval"),
    }),
    execute: async ({ symbol, indicators, interval }) => {
      const params: Record<string, string> = { interval };
      if (indicators) params.indicators = indicators;
      return apiGet(
        baseURL,
        apiKey,
        `/vq/technicals/${encodeURIComponent(symbol)}`,
        params,
        timeout,
      );
    },
  });

  // ── News & Sentiment ──

  const getNews = tool({
    description: "Get latest financial news, optionally filtered by symbols",
    parameters: z.object({
      symbols: z
        .string()
        .optional()
        .describe("Comma-separated symbols to filter news"),
      limit: z.number().min(1).max(50).default(10).describe("Number of articles"),
    }),
    execute: async ({ symbols, limit }) => {
      const params: Record<string, string> = { limit: String(limit) };
      if (symbols) params.symbols = symbols;
      return apiGet(baseURL, apiKey, "/vq/news", params, timeout);
    },
  });

  const getAnalystRatings = tool({
    description: "Get analyst consensus ratings and price targets for a stock",
    parameters: z.object({
      symbol: z.string().describe("Stock ticker symbol"),
    }),
    execute: async ({ symbol }) =>
      apiGet(
        baseURL,
        apiKey,
        `/vq/analyst/${encodeURIComponent(symbol)}/consensus`,
        undefined,
        timeout,
      ),
  });

  // ── Screening ──

  const runScreener = tool({
    description:
      "Screen stocks with filters (e.g., market_cap > 1B, pe_ratio < 20)",
    parameters: z.object({
      filters: z
        .record(z.unknown())
        .describe("Filter object (e.g., { market_cap_gt: 1000000000 })"),
      limit: z.number().min(1).max(100).default(20).describe("Max results"),
    }),
    execute: async ({ filters, limit }) =>
      apiPost(baseURL, apiKey, "/vq/screener", { filters, limit }, timeout),
  });

  // ── AI Analysis ──

  const analyzeStock = tool({
    description: "Run AI-powered financial analysis on a stock or topic",
    parameters: z.object({
      prompt: z.string().describe("Analysis prompt (e.g., 'Analyze AAPL earnings')"),
    }),
    execute: async ({ prompt }) =>
      apiPost(baseURL, apiKey, "/vq/ai/analyze", { prompt, stream: false }, timeout),
  });

  const compareStocks = tool({
    description: "AI-powered side-by-side comparison of multiple stocks",
    parameters: z.object({
      symbols: z
        .array(z.string())
        .min(2)
        .max(5)
        .describe("Symbols to compare (2–5)"),
    }),
    execute: async ({ symbols }) =>
      apiPost(
        baseURL,
        apiKey,
        "/vq/ai/analyze",
        { prompt: `Compare: ${symbols.join(" vs ")}`, stream: false },
        timeout,
      ),
  });

  // ── Options ──

  const getOptionsChain = tool({
    description: "Get the options chain for a symbol",
    parameters: z.object({
      symbol: z.string().describe("Stock ticker symbol"),
      expiration: z.string().optional().describe("Expiration date (YYYY-MM-DD)"),
    }),
    execute: async ({ symbol, expiration }) => {
      const params: Record<string, string> = {};
      if (expiration) params.expiration = expiration;
      return apiGet(
        baseURL,
        apiKey,
        `/vq/options/${encodeURIComponent(symbol)}/chain`,
        params,
        timeout,
      );
    },
  });

  // ── Earnings ──

  const getEarnings = tool({
    description: "Get historical earnings data for a stock",
    parameters: z.object({
      symbol: z.string().describe("Stock ticker symbol"),
    }),
    execute: async ({ symbol }) =>
      apiGet(
        baseURL,
        apiKey,
        `/vq/earnings/${encodeURIComponent(symbol)}/history`,
        undefined,
        timeout,
      ),
  });

  // ── Insider Activity ──

  const getInsiderTransactions = tool({
    description: "Get recent insider buying/selling transactions for a stock",
    parameters: z.object({
      symbol: z.string().describe("Stock ticker symbol"),
    }),
    execute: async ({ symbol }) =>
      apiGet(
        baseURL,
        apiKey,
        `/vq/insider/${encodeURIComponent(symbol)}/transactions`,
        undefined,
        timeout,
      ),
  });

  // ── Return all tools via a factory method ──

  function tools() {
    return {
      getQuote,
      getBatchQuotes,
      getFundamentals,
      getIncomeStatement,
      getBalanceSheet,
      getTechnicals,
      getNews,
      getAnalystRatings,
      runScreener,
      analyzeStock,
      compareStocks,
      getOptionsChain,
      getEarnings,
      getInsiderTransactions,
    };
  }

  return {
    /** All available financial tools. */
    tools,
    /** Individual tools for selective use. */
    getQuote,
    getBatchQuotes,
    getFundamentals,
    getIncomeStatement,
    getBalanceSheet,
    getTechnicals,
    getNews,
    getAnalystRatings,
    runScreener,
    analyzeStock,
    compareStocks,
    getOptionsChain,
    getEarnings,
    getInsiderTransactions,
  };
}
