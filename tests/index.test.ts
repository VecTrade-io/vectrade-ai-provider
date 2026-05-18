import { describe, it, expect } from "vitest";
import { createVecTrade } from "../src/index";
import defaultExport from "../src/index";

describe("index re-exports", () => {
  it("exports createVecTrade as named export", () => {
    expect(createVecTrade).toBeTypeOf("function");
  });

  it("exports createVecTrade as default export", () => {
    expect(defaultExport).toBe(createVecTrade);
  });
});
