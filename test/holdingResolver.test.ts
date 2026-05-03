import { describe, expect, it } from "vitest";
import {
  extractHoldingsFromResponse,
  parseHoldingSelector,
  resolveHoldingBySymbol,
  type HoldingSummary,
} from "../src/holdingResolver.js";

const holdings: HoldingSummary[] = [
  { id: 1, symbol: "AAPL", market: "NASDAQ", name: "Apple Inc" },
  { id: 2, symbol: "AAPL", market: "XETR", name: "Apple Inc" },
  { id: 3, symbol: "VAS", market: "ASX", name: "Vanguard Australian Shares Index ETF" },
  { id: 4, symbol: "BRK.B", market: "NYSE", name: "Berkshire Hathaway Inc" },
];

describe("parseHoldingSelector", () => {
  it("parses an unqualified symbol", () => {
    expect(parseHoldingSelector("AAPL")).toEqual({ symbol: "AAPL" });
  });

  it("parses a symbol qualified with market", () => {
    expect(parseHoldingSelector("AAPL.NASDAQ")).toEqual({
      symbol: "AAPL",
      market: "NASDAQ",
    });
  });

  it("uses the last dot as the market separator", () => {
    expect(parseHoldingSelector("BRK.B.NYSE")).toEqual({
      symbol: "BRK.B",
      market: "NYSE",
    });
  });

  it("rejects a missing market after the separator", () => {
    expect(() => parseHoldingSelector("AAPL.")).toThrow("Holding must be");
  });
});

describe("resolveHoldingBySymbol", () => {
  it("resolves a unique unqualified symbol", () => {
    expect(resolveHoldingBySymbol("vas", holdings)).toEqual(holdings[2]);
  });

  it("resolves a qualified symbol case-insensitively", () => {
    expect(resolveHoldingBySymbol("aapl.nasdaq", holdings)).toEqual(holdings[0]);
  });

  it("throws when an unqualified symbol is ambiguous", () => {
    expect(() => resolveHoldingBySymbol("AAPL", holdings)).toThrow(
      "Matching holdings: AAPL.NASDAQ, AAPL.XETR",
    );
  });

  it("throws when no holding matches", () => {
    expect(() => resolveHoldingBySymbol("MSFT", holdings)).toThrow("No holding found");
  });
});

describe("extractHoldingsFromResponse", () => {
  it("extracts holdings from a Sharesight response", () => {
    expect(
      extractHoldingsFromResponse({
        holdings: [
          {
            id: "10036710,",
            symbol: "AAPL",
            instrument: {
              market_code: "NASDAQ",
              name: "Apple Inc",
            },
          },
        ],
      }),
    ).toEqual([
      {
        id: 10036710,
        symbol: "AAPL",
        market: "NASDAQ",
        name: "Apple Inc",
      },
    ]);
  });
});
