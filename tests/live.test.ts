/**
 * Live integration tests for @vectrade/ai-provider.
 *
 * Requires VECTRADE_TEST_API_KEY environment variable.
 * Skipped when the key is not set.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { createVecTrade } from "../src/provider";

const API_KEY = process.env.VECTRADE_TEST_API_KEY ?? "";
const describeIf = API_KEY ? describe : describe.skip;

describeIf("Live Integration Tests", () => {
  let vt: ReturnType<typeof createVecTrade>;

  beforeAll(() => {
    vt = createVecTrade({
      apiKey: API_KEY,
      timeout: 15_000,
    });
  });

  // ── Auth enforcement ──

  describe("Auth enforcement", () => {
    it("rejects requests without valid key", async () => {
      const badVt = createVecTrade({
        apiKey: "vq_invalid_key_12345",
        timeout: 10_000,
      });
      await expect(
        badVt.getQuote.execute({ symbol: "AAPL" }, { toolCallId: "t1", messages: [] }),
      ).rejects.toThrow(/4(01|03)/);
    });

    it("succeeds with valid key", async () => {
      const result = await vt.getQuote.execute(
        { symbol: "AAPL" },
        { toolCallId: "t2", messages: [] },
      );
      expect(result).toBeDefined();
    });
  });

  // ── Quotes ──

  describe("Quotes", () => {
    it("gets a single quote", async () => {
      const result = (await vt.getQuote.execute(
        { symbol: "AAPL" },
        { toolCallId: "t3", messages: [] },
      )) as Record<string, unknown>;
      expect(result).toBeDefined();
      expect(typeof result).toBe("object");
    });

    it("gets batch quotes", async () => {
      const result = await vt.getBatchQuotes.execute(
        { symbols: ["AAPL", "MSFT"] },
        { toolCallId: "t4", messages: [] },
      );
      expect(result).toBeDefined();
    });
  });

  // ── Fundamentals ──

  describe("Fundamentals", () => {
    it("gets fundamentals or returns structured error", async () => {
      try {
        const result = await vt.getFundamentals.execute(
          { symbol: "AAPL" },
          { toolCallId: "t5", messages: [] },
        );
        expect(result).toBeDefined();
      } catch (e: unknown) {
        // 404 acceptable for endpoints not yet deployed
        expect((e as Error).message).toMatch(/4(04|00)/);
      }
    });

    it("gets financial statements or returns structured error", async () => {
      try {
        const result = await vt.getFinancialStatements.execute(
          { symbol: "AAPL" },
          { toolCallId: "t6", messages: [] },
        );
        expect(result).toBeDefined();
      } catch (e: unknown) {
        expect((e as Error).message).toMatch(/4(04|00)/);
      }
    });
  });

  // ── Technicals ──

  describe("Technicals", () => {
    it("gets technical indicators or returns structured error", async () => {
      try {
        const result = await vt.getTechnicals.execute(
          { symbol: "AAPL", interval: "1d" },
          { toolCallId: "t8", messages: [] },
        );
        expect(result).toBeDefined();
      } catch (e: unknown) {
        expect((e as Error).message).toMatch(/4(04|00)/);
      }
    });
  });

  // ── News ──

  describe("News", () => {
    it("gets news or returns structured error", async () => {
      try {
        const result = await vt.getNews.execute(
          { symbol: "AAPL" },
          { toolCallId: "t9", messages: [] },
        );
        expect(result).toBeDefined();
      } catch (e: unknown) {
        expect((e as Error).message).toMatch(/4(04|00)/);
      }
    });

    it("gets analyst ratings or returns structured error", async () => {
      try {
        const result = await vt.getAnalystRatings.execute(
          { symbol: "AAPL" },
          { toolCallId: "t10", messages: [] },
        );
        expect(result).toBeDefined();
      } catch (e: unknown) {
        expect((e as Error).message).toMatch(/4(04|00)/);
      }
    });
  });

  // ── Performance ──

  describe("Performance", () => {
    it("responds within 5 seconds", async () => {
      const start = Date.now();
      await vt.getQuote.execute(
        { symbol: "MSFT" },
        { toolCallId: "t12", messages: [] },
      );
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(5000);
    });
  });
});
