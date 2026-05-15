import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createVecTrade } from "../src/provider";

// ── Mock fetch globally ────────────────────────────────────────────────

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
  vi.stubEnv("VECTRADE_API_KEY", "");
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function mockJsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ── Configuration ──────────────────────────────────────────────────────

describe("createVecTrade", () => {
  it("throws when no API key is provided", () => {
    expect(() => createVecTrade()).toThrow("API key is required");
  });

  it("reads API key from env var", () => {
    vi.stubEnv("VECTRADE_API_KEY", "vq_test_env_key");
    const vt = createVecTrade();
    expect(vt.tools).toBeDefined();
  });

  it("prefers explicit apiKey over env var", async () => {
    vi.stubEnv("VECTRADE_API_KEY", "vq_env_key");
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({ symbol: "AAPL", price: 198.5 }),
    );

    const vt = createVecTrade({ apiKey: "vq_explicit_key" });
    await vt.getQuote.execute({ symbol: "AAPL" }, { toolCallId: "tc_1", messages: [] });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers.Authorization).toBe("Bearer vq_explicit_key");
  });
});

// ── Tool inventory ─────────────────────────────────────────────────────

describe("tools()", () => {
  it("returns all 14 tools", () => {
    const vt = createVecTrade({ apiKey: "vq_test_key" });
    const allTools = vt.tools();
    const names = Object.keys(allTools);

    expect(names).toHaveLength(14);
    expect(names).toEqual(
      expect.arrayContaining([
        "getQuote",
        "getBatchQuotes",
        "getFundamentals",
        "getIncomeStatement",
        "getBalanceSheet",
        "getTechnicals",
        "getNews",
        "getAnalystRatings",
        "runScreener",
        "analyzeStock",
        "compareStocks",
        "getOptionsChain",
        "getEarnings",
        "getInsiderTransactions",
      ]),
    );
  });

  it("exposes individual tools on the provider object", () => {
    const vt = createVecTrade({ apiKey: "vq_test_key" });
    expect(vt.getQuote).toBeDefined();
    expect(vt.analyzeStock).toBeDefined();
    expect(vt.getInsiderTransactions).toBeDefined();
  });
});

// ── GET tools ──────────────────────────────────────────────────────────

describe("getQuote", () => {
  it("calls the correct endpoint with auth header", async () => {
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({ symbol: "AAPL", price: 198.5 }),
    );

    const vt = createVecTrade({ apiKey: "vq_test_key" });
    const result = await vt.getQuote.execute(
      { symbol: "AAPL" },
      { toolCallId: "tc_1", messages: [] },
    );

    expect(result).toEqual({ symbol: "AAPL", price: 198.5 });
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain("/vq/quotes/AAPL");
    expect(init.headers.Authorization).toBe("Bearer vq_test_key");
  });

  it("URL-encodes the symbol to prevent path traversal", async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse({}));

    const vt = createVecTrade({ apiKey: "vq_test_key" });
    await vt.getQuote.execute(
      { symbol: "../secrets" },
      { toolCallId: "tc_2", messages: [] },
    );

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("%2F");
    expect(url).not.toContain("../");
  });
});

describe("getBatchQuotes", () => {
  it("joins symbols as comma-separated query param", async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse({ data: [] }));

    const vt = createVecTrade({ apiKey: "vq_test_key" });
    await vt.getBatchQuotes.execute(
      { symbols: ["AAPL", "GOOGL", "MSFT"] },
      { toolCallId: "tc_3", messages: [] },
    );

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("symbols=AAPL%2CGOOGL%2CMSFT");
  });
});

describe("getFundamentals", () => {
  it("calls /vq/fundamentals/:symbol", async () => {
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({ symbol: "MSFT", pe_ratio: 35.2 }),
    );

    const vt = createVecTrade({ apiKey: "vq_test_key" });
    const result = await vt.getFundamentals.execute(
      { symbol: "MSFT" },
      { toolCallId: "tc_4", messages: [] },
    );

    expect(result).toHaveProperty("pe_ratio");
    expect(mockFetch.mock.calls[0][0]).toContain("/vq/fundamentals/MSFT");
  });
});

describe("getTechnicals", () => {
  it("passes indicators and interval as query params", async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse({ rsi: 65 }));

    const vt = createVecTrade({ apiKey: "vq_test_key" });
    await vt.getTechnicals.execute(
      { symbol: "AAPL", indicators: "rsi,macd", interval: "1d" },
      { toolCallId: "tc_5", messages: [] },
    );

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("indicators=rsi%2Cmacd");
    expect(url).toContain("interval=1d");
  });
});

describe("getNews", () => {
  it("includes limit and optional symbols params", async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse({ data: [] }));

    const vt = createVecTrade({ apiKey: "vq_test_key" });
    await vt.getNews.execute(
      { symbols: "AAPL,GOOGL", limit: 5 },
      { toolCallId: "tc_6", messages: [] },
    );

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("limit=5");
    expect(url).toContain("symbols=AAPL%2CGOOGL");
  });
});

describe("getOptionsChain", () => {
  it("calls /vq/options/:symbol/chain", async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse({ calls: [], puts: [] }));

    const vt = createVecTrade({ apiKey: "vq_test_key" });
    await vt.getOptionsChain.execute(
      { symbol: "AAPL", expiration: "2026-06-20" },
      { toolCallId: "tc_7", messages: [] },
    );

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("/vq/options/AAPL/chain");
    expect(url).toContain("expiration=2026-06-20");
  });
});

// ── POST tools ─────────────────────────────────────────────────────────

describe("analyzeStock", () => {
  it("sends POST with prompt in body", async () => {
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({ analysis: "Strong buy..." }),
    );

    const vt = createVecTrade({ apiKey: "vq_test_key" });
    const result = await vt.analyzeStock.execute(
      { prompt: "Analyze AAPL" },
      { toolCallId: "tc_8", messages: [] },
    );

    expect(result).toHaveProperty("analysis");
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain("/vq/ai/analyze");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body);
    expect(body.prompt).toBe("Analyze AAPL");
    expect(body.stream).toBe(false);
  });
});

describe("runScreener", () => {
  it("sends POST with filters and limit", async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse({ data: [], total: 0 }));

    const vt = createVecTrade({ apiKey: "vq_test_key" });
    await vt.runScreener.execute(
      { filters: { market_cap_gt: 1_000_000_000 }, limit: 10 },
      { toolCallId: "tc_9", messages: [] },
    );

    const [, init] = mockFetch.mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body.filters).toEqual({ market_cap_gt: 1_000_000_000 });
    expect(body.limit).toBe(10);
  });
});

// ── Error handling ─────────────────────────────────────────────────────

describe("error handling", () => {
  it("throws on non-OK response", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response('{"error":"not_found"}', { status: 404 }),
    );

    const vt = createVecTrade({ apiKey: "vq_test_key" });
    await expect(
      vt.getQuote.execute({ symbol: "INVALID" }, { toolCallId: "tc_err", messages: [] }),
    ).rejects.toThrow("VecTrade API error 404");
  });

  it("throws on network failure", async () => {
    mockFetch.mockRejectedValueOnce(new TypeError("fetch failed"));

    const vt = createVecTrade({ apiKey: "vq_test_key" });
    await expect(
      vt.getQuote.execute({ symbol: "AAPL" }, { toolCallId: "tc_net", messages: [] }),
    ).rejects.toThrow("fetch failed");
  });
});

// ── Previously untested tools ─────────────────────────────────────────

describe("getIncomeStatement", () => {
  it("calls /vq/fundamentals/:symbol/income-statement with period", async () => {
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({ data: [{ revenue: 100_000_000 }] }),
    );

    const vt = createVecTrade({ apiKey: "vq_test_key" });
    const result = await vt.getIncomeStatement.execute(
      { symbol: "AAPL", period: "quarterly" },
      { toolCallId: "tc_is", messages: [] },
    );

    expect(result).toHaveProperty("data");
    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("/vq/fundamentals/AAPL/income-statement");
    expect(url).toContain("period=quarterly");
  });

  it("defaults to annual period", async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse({ data: [] }));

    const vt = createVecTrade({ apiKey: "vq_test_key" });
    await vt.getIncomeStatement.execute(
      { symbol: "MSFT" },
      { toolCallId: "tc_is2", messages: [] },
    );

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("period=annual");
  });
});

describe("getBalanceSheet", () => {
  it("calls /vq/fundamentals/:symbol/balance-sheet with period", async () => {
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({ data: [{ totalAssets: 350_000_000_000 }] }),
    );

    const vt = createVecTrade({ apiKey: "vq_test_key" });
    const result = await vt.getBalanceSheet.execute(
      { symbol: "GOOGL", period: "annual" },
      { toolCallId: "tc_bs", messages: [] },
    );

    expect(result).toHaveProperty("data");
    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("/vq/fundamentals/GOOGL/balance-sheet");
    expect(url).toContain("period=annual");
  });
});

describe("getAnalystRatings", () => {
  it("calls /vq/analyst/:symbol/consensus", async () => {
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({ consensus: "Buy", targetPrice: 220 }),
    );

    const vt = createVecTrade({ apiKey: "vq_test_key" });
    const result = await vt.getAnalystRatings.execute(
      { symbol: "AAPL" },
      { toolCallId: "tc_ar", messages: [] },
    );

    expect(result).toHaveProperty("consensus");
    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("/vq/analyst/AAPL/consensus");
  });

  it("URL-encodes the symbol", async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse({}));

    const vt = createVecTrade({ apiKey: "vq_test_key" });
    await vt.getAnalystRatings.execute(
      { symbol: "BRK.B" },
      { toolCallId: "tc_ar2", messages: [] },
    );

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("BRK.B");
  });
});

describe("compareStocks", () => {
  it("sends POST to /vq/ai/analyze with comparison prompt", async () => {
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({ analysis: "AAPL vs MSFT..." }),
    );

    const vt = createVecTrade({ apiKey: "vq_test_key" });
    const result = await vt.compareStocks.execute(
      { symbols: ["AAPL", "MSFT"] },
      { toolCallId: "tc_cmp", messages: [] },
    );

    expect(result).toHaveProperty("analysis");
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain("/vq/ai/analyze");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body);
    expect(body.prompt).toContain("AAPL");
    expect(body.prompt).toContain("MSFT");
    expect(body.stream).toBe(false);
  });
});

describe("getEarnings", () => {
  it("calls /vq/earnings/:symbol/history", async () => {
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({ data: [{ quarter: "Q1 2026", epsActual: 2.1 }] }),
    );

    const vt = createVecTrade({ apiKey: "vq_test_key" });
    const result = await vt.getEarnings.execute(
      { symbol: "TSLA" },
      { toolCallId: "tc_earn", messages: [] },
    );

    expect(result).toHaveProperty("data");
    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("/vq/earnings/TSLA/history");
  });
});

describe("getInsiderTransactions", () => {
  it("calls /vq/insider/:symbol/transactions", async () => {
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({ data: [{ insider: "Tim Cook", type: "sale", shares: 100_000 }] }),
    );

    const vt = createVecTrade({ apiKey: "vq_test_key" });
    const result = await vt.getInsiderTransactions.execute(
      { symbol: "AAPL" },
      { toolCallId: "tc_insider", messages: [] },
    );

    expect(result).toHaveProperty("data");
    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("/vq/insider/AAPL/transactions");
  });

  it("URL-encodes symbol for path safety", async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse({ data: [] }));

    const vt = createVecTrade({ apiKey: "vq_test_key" });
    await vt.getInsiderTransactions.execute(
      { symbol: "../admin" },
      { toolCallId: "tc_insider2", messages: [] },
    );

    const [url] = mockFetch.mock.calls[0];
    expect(url).not.toContain("../");
    expect(url).toContain("%2F");
  });
});

// ── Custom base URL ────────────────────────────────────────────────────

describe("custom baseURL", () => {
  it("strips trailing slash from base URL", async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse({ symbol: "AAPL" }));

    const vt = createVecTrade({
      apiKey: "vq_test_key",
      baseURL: "https://custom.api.com/v2/",
    });
    await vt.getQuote.execute({ symbol: "AAPL" }, { toolCallId: "tc_url", messages: [] });

    const [url] = mockFetch.mock.calls[0];
    expect(url).toMatch(/^https:\/\/custom\.api\.com\/v2\/vq\/quotes\/AAPL/);
    expect(url).not.toContain("//vq");
  });
});
