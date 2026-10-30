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
    expect(init.headers["X-API-Key"]).toBe("vq_explicit_key");
  });
});

// ── Tool inventory ─────────────────────────────────────────────────────

describe("tools()", () => {
  it("returns all 16 tools", () => {
    const vt = createVecTrade({ apiKey: "vq_test_key" });
    const allTools = vt.tools();
    const names = Object.keys(allTools);

    expect(names).toHaveLength(16);
    expect(names).toEqual(
      expect.arrayContaining([
        "getQuote",
        "getBatchQuotes",
        "getHistoricalPrices",
        "getFundamentals",
        "getFinancialStatements",
        "getCompanyProfile",
        "getTechnicals",
        "getNews",
        "getSentiment",
        "getAnalystRatings",
        "getAnalystTargets",
        "getUpgradesDowngrades",
        "getOptionsChain",
        "getEarnings",
        "getInsiderTransactions",
        "getETF",
      ]),
    );
  });

  it("exposes individual tools on the provider object", () => {
    const vt = createVecTrade({ apiKey: "vq_test_key" });
    expect(vt.getQuote).toBeDefined();
    expect(vt.getFinancialStatements).toBeDefined();
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
    expect(init.headers["X-API-Key"]).toBe("vq_test_key");
  });

  it("unwraps a VQ success envelope", async () => {
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({
        status: "ok",
        data: { symbol: "AAPL", price: 198.5 },
      }),
    );

    const vt = createVecTrade({ apiKey: "vq_test_key" });
    const result = await vt.getQuote.execute(
      { symbol: "AAPL" },
      { toolCallId: "tc_envelope", messages: [] },
    );

    expect(result).toEqual({ symbol: "AAPL", price: 198.5 });
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
  it("joins symbols into the API's tickers query parameter", async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse({ data: [] }));

    const vt = createVecTrade({ apiKey: "vq_test_key" });
    await vt.getBatchQuotes.execute(
      { symbols: ["AAPL", "GOOGL", "MSFT"] },
      { toolCallId: "tc_3", messages: [] },
    );

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("tickers=AAPL%2CGOOGL%2CMSFT");
    expect(url).not.toContain("symbols=");
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

  it("omits indicators param when not provided", async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse({ data: {} }));

    const vt = createVecTrade({ apiKey: "vq_test_key" });
    await vt.getTechnicals.execute(
      { symbol: "AAPL", interval: "1d" },
      { toolCallId: "tc_tech_no_ind", messages: [] },
    );

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("interval=1d");
    expect(url).not.toContain("indicators=");
  });
});

describe("getNews", () => {
  it("calls the symbol news endpoint", async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse({ articles: [] }));

    const vt = createVecTrade({ apiKey: "vq_test_key" });
    await vt.getNews.execute(
      { symbol: "AAPL" },
      { toolCallId: "tc_6", messages: [] },
    );

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("/vq/news/AAPL");
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

  it("throws on non-OK response from financial statements", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response('{"error":"internal"}', { status: 500 }),
    );

    const vt = createVecTrade({ apiKey: "vq_test_key" });
    await expect(
      vt.getFinancialStatements.execute({ symbol: "AAPL" }, { toolCallId: "tc_stmt_err", messages: [] }),
    ).rejects.toThrow("VecTrade API error 500");
  });
});

// ── Previously untested tools ─────────────────────────────────────────

describe("getFinancialStatements", () => {
  it("calls the current nested financial statements endpoint", async () => {
    const response = {
      ticker: "AAPL",
      income_statement: { earnings: [{ "Total Revenue": 100_000_000 }] },
      balance_sheet: { earnings: [{ "Total Assets": 350_000_000_000 }] },
      cashflow_statement: { earnings: [] },
    };
    mockFetch.mockResolvedValueOnce(mockJsonResponse(response));

    const vt = createVecTrade({ apiKey: "vq_test_key" });
    const result = await vt.getFinancialStatements.execute(
      { symbol: "AAPL" },
      { toolCallId: "tc_statements", messages: [] },
    );

    expect(result).toEqual(response);
    expect(mockFetch.mock.calls[0][0]).toContain("/vq/fundamentals/AAPL/statements");
  });
});

describe("getCompanyProfile", () => {
  it("calls the company profile endpoint", async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse({ ticker: "AAPL", company: { name: "Apple Inc." } }));

    const vt = createVecTrade({ apiKey: "vq_test_key" });
    await vt.getCompanyProfile.execute({ symbol: "AAPL" }, { toolCallId: "tc_profile", messages: [] });

    expect(mockFetch.mock.calls[0][0]).toContain("/vq/profile/AAPL");
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
    expect(url).toContain("/vq/analyst-consensus/AAPL");
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

describe("getAnalystTargets", () => {
  it("calls the current analyst price targets endpoint", async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse({ targets: [] }));

    const vt = createVecTrade({ apiKey: "vq_test_key" });
    await vt.getAnalystTargets.execute({ symbol: "AAPL" }, { toolCallId: "tc_targets", messages: [] });

    expect(mockFetch.mock.calls[0][0]).toContain("/vq/analyst-targets/AAPL");
  });
});

describe("getUpgradesDowngrades", () => {
  it("calls the current analyst ratings endpoint", async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse({ upgrades_downgrades: [] }));

    const vt = createVecTrade({ apiKey: "vq_test_key" });
    await vt.getUpgradesDowngrades.execute({ symbol: "AAPL" }, { toolCallId: "tc_ratings", messages: [] });

    expect(mockFetch.mock.calls[0][0]).toContain("/vq/upgrades-downgrades/AAPL");
  });
});

describe("getEarnings", () => {
  it("calls the current earnings endpoint", async () => {
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
    expect(url).toContain("/vq/earnings/TSLA");
  });
});

describe("getInsiderTransactions", () => {
  it("calls the current insider endpoint", async () => {
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
    expect(url).toContain("/vq/insider/AAPL");
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

describe("getSentiment", () => {
  it("calls /vq/sentiment/:symbol", async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse({ score: 0.4 }));

    const vt = createVecTrade({ apiKey: "vq_test_key" });
    await vt.getSentiment.execute({ symbol: "AAPL" }, { toolCallId: "tc_sent", messages: [] });

    expect(mockFetch.mock.calls[0][0]).toContain("/vq/sentiment/AAPL");
  });
});

describe("getHistoricalPrices", () => {
  it("calls /vq/quotes/:symbol/history with period", async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse({ data: [] }));

    const vt = createVecTrade({ apiKey: "vq_test_key" });
    await vt.getHistoricalPrices.execute(
      { symbol: "AAPL", period: "1mo" },
      { toolCallId: "tc_hist", messages: [] },
    );

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("/vq/quotes/AAPL/history");
    expect(url).toContain("period=1mo");
  });
});

describe("getETF", () => {
  it("calls /vq/etf/:symbol", async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse({ ticker: "SPY" }));

    const vt = createVecTrade({ apiKey: "vq_test_key" });
    await vt.getETF.execute({ symbol: "SPY" }, { toolCallId: "tc_etf", messages: [] });

    expect(mockFetch.mock.calls[0][0]).toContain("/vq/etf/SPY");
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

// ── Timeout handling ───────────────────────────────────────────────────

describe("timeout configuration", () => {
  it("passes no signal when timeout is 0 (disabled)", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ symbol: "AAPL" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const vt = createVecTrade({ apiKey: "vq_test_key", timeout: 0 });
    await vt.getQuote.execute({ symbol: "AAPL" }, { toolCallId: "tc_no_timeout", messages: [] });

    const [, init] = mockFetch.mock.calls[0];
    expect(init.signal).toBeUndefined();
  });

  it("passes AbortSignal when timeout is set", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ symbol: "AAPL" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const vt = createVecTrade({ apiKey: "vq_test_key", timeout: 5000 });
    await vt.getQuote.execute({ symbol: "AAPL" }, { toolCallId: "tc_timeout", messages: [] });

    const [, init] = mockFetch.mock.calls[0];
    expect(init.signal).toBeDefined();
  });
});
