import { describe, expect, it } from "vitest";
import { renderPerformanceTableView } from "../src/performanceView.js";

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
        labels: [
          {
            id: 1,
            name: "Core",
          },
          {
            id: 2,
            name: "ETF",
          },
        ],
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

  it("renders table view with grouped holdings", () => {
    const result = renderPerformanceTableView({
      portfolioId: 1,
      portfolioName: "Main",
      consolidated: false,
      report: samplePayload,
    }) as Record<string, unknown>;

    const groups = result.groups as Array<Record<string, unknown>>;
    expect((result.meta as Record<string, unknown>).groupedBy).toBe("market");
    expect((result.meta as Record<string, unknown>).openPositionsOnly).toBe(true);
    expect(groups.length).toBe(1);
    expect(groups[0]?.groupName).toBe("ASX");
    expect(groups[0]?.portfolioWeightPercent).toBe(50);
    expect(groups[0]?.performanceContributionPercent).toBe(100);
    expect(groups[0]?.value).toBe(500);
    expect(groups[0]?.capitalGain).toBe(100);
    expect(groups[0]?.totalGain).toBe(125);
    expect(groups[0]?.totals).toBeUndefined();
    const holdings = groups[0]?.holdings as Array<Record<string, unknown>>;
    expect(holdings.length).toBe(1);
    expect(holdings[0]?.labels).toEqual(["Core", "ETF"]);
    expect(holdings[0]?.groupId).toBeUndefined();
    expect(holdings[0]?.groupName).toBeUndefined();
    expect(holdings[0]?.portfolioWeightPercent).toBe(50);
    expect(holdings[0]?.performanceContributionPercent).toBe(100);
  });

  it("renders table view when payload is only one report level", () => {
    const result = renderPerformanceTableView({
      portfolioId: 1,
      portfolioName: "Main",
      consolidated: false,
      report: { report: sampleReport },
    }) as Record<string, unknown>;

    expect((result.meta as Record<string, unknown>).groupedBy).toBe("market");
  });

  it("renders table view when payload is direct report shape", () => {
    const result = renderPerformanceTableView({
      portfolioId: 1,
      portfolioName: "Main",
      consolidated: false,
      report: sampleReport,
    }) as Record<string, unknown>;

    expect((result.meta as Record<string, unknown>).groupedBy).toBe("market");
  });
});
