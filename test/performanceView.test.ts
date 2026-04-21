import { describe, expect, it } from "vitest";
import { normalizePerformanceView, renderPerformanceView } from "../src/performanceView.js";

describe("normalizePerformanceView", () => {
  it("accepts table and raw", () => {
    expect(normalizePerformanceView("table")).toBe("table");
    expect(normalizePerformanceView("raw")).toBe("raw");
  });

  it("throws for unsupported values", () => {
    expect(() => normalizePerformanceView("summary")).toThrow("Unsupported view");
  });
});

describe("renderPerformanceView", () => {
  const sampleReport = {
    id: "PerformanceReport_1",
    grouping: "market",
    start_date: "2025-01-01",
    end_date: "2025-12-31",
    include_sales: false,
    percentages_annualised: true,
    currency: {
      code: "NZD",
      symbol: "$",
      qualified_symbol: "NZ$",
    },
    value: 1000,
    capital_gain: 200,
    payout_gain: 50,
    currency_gain: 10,
    total_gain: 260,
    holdings: [
      {
        id: 10,
        group_id: 2,
        group_name: "ASX",
        instrument: {
          code: "VAS",
          market_code: "ASX",
          name: "Vanguard Australian Shares Index Etf",
        },
        quantity: 100,
        value: 500,
        instrument_price: 5,
        capital_gain: 100,
        payout_gain: 20,
        currency_gain: 5,
        total_gain: 125,
        number_of_unconfirmed_transactions: 2,
      },
    ],
    sub_totals: [
      {
        group_id: 2,
        group_name: "ASX",
        value: 500,
        capital_gain: 100,
        payout_gain: 20,
        currency_gain: 5,
        total_gain: 125,
      },
    ],
    cash_accounts: [],
  };

  const samplePayload = {
    report: {
      report: sampleReport,
    },
  };

  it("renders raw view passthrough", () => {
    const result = renderPerformanceView({
      view: "raw",
      portfolioId: 1,
      portfolioName: "Main",
      consolidated: false,
      grouping: "market",
      customGroupId: undefined,
      report: samplePayload,
    }) as Record<string, unknown>;

    expect(result.portfolioId).toBe(1);
    expect(result.portfolioName).toBe("Main");
    expect(result.report).toEqual(samplePayload);
  });

  it("renders table view with grouped holdings", () => {
    const result = renderPerformanceView({
      view: "table",
      portfolioId: 1,
      portfolioName: "Main",
      consolidated: false,
      grouping: "market",
      customGroupId: undefined,
      report: samplePayload,
    }) as Record<string, unknown>;

    const groups = result.groups as Array<Record<string, unknown>>;
    expect((result.meta as Record<string, unknown>).groupedBy).toBe("market");
    expect((result.meta as Record<string, unknown>).openPositionsOnly).toBe(true);
    expect(groups.length).toBe(1);
    expect(groups[0]?.groupName).toBe("ASX");
    expect((groups[0]?.holdings as unknown[]).length).toBe(1);
  });

  it("renders table view when payload is only one report level", () => {
    const result = renderPerformanceView({
      view: "table",
      portfolioId: 1,
      portfolioName: "Main",
      consolidated: false,
      report: { report: sampleReport },
    }) as Record<string, unknown>;

    expect((result.meta as Record<string, unknown>).groupedBy).toBe("market");
  });

  it("renders table view when payload is direct report shape", () => {
    const result = renderPerformanceView({
      view: "table",
      portfolioId: 1,
      portfolioName: "Main",
      consolidated: false,
      report: sampleReport,
    }) as Record<string, unknown>;

    expect((result.meta as Record<string, unknown>).groupedBy).toBe("market");
  });
});
