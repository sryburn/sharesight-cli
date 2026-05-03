import { describe, expect, it } from "vitest";
import { renderTransactionListView } from "../src/transactionView.js";

describe("renderTransactionListView", () => {
  const portfolio = { id: 123, name: "Main", consolidated: false };

  it("renders trades with portfolio context", () => {
    const output = renderTransactionListView({
      portfolio,
      kind: "trades",
      response: {
        trades: [
          {
            id: 1,
            symbol: "AAPL",
            market: "NASDAQ",
          },
        ],
      },
      query: {
        start_date: "2024-01-01",
        end_date: "2024-12-31",
        unique_identifier: "abc",
      },
    }) as Record<string, unknown>;

    expect(output.portfolio).toEqual(portfolio);
    expect(output.holding).toBeUndefined();
    expect(output.meta).toEqual({
      source: "portfolio",
      startDate: "2024-01-01",
      endDate: "2024-12-31",
      useDate: undefined,
      uniqueIdentifier: "abc",
      count: 1,
    });
    expect(output.trades).toEqual([{ id: 1, symbol: "AAPL", market: "NASDAQ" }]);
  });

  it("renders payouts with holding context", () => {
    const output = renderTransactionListView({
      portfolio,
      holding: {
        id: 456,
        symbol: "VAS",
        market: "ASX",
        name: "Vanguard Australian Shares Index ETF",
      },
      kind: "payouts",
      response: {
        payouts: [
          {
            id: 2,
            symbol: "VAS",
            market: "ASX",
          },
        ],
      },
      query: {
        use_date: "ex_date",
      },
    }) as Record<string, unknown>;

    expect(output.holding).toEqual({
      id: 456,
      symbol: "VAS",
      market: "ASX",
      name: "Vanguard Australian Shares Index ETF",
    });
    expect(output.meta).toMatchObject({
      source: "holding",
      useDate: "ex_date",
      count: 1,
    });
    expect(output.payouts).toEqual([{ id: 2, symbol: "VAS", market: "ASX" }]);
  });

  it("throws for unexpected response shape", () => {
    expect(() =>
      renderTransactionListView({
        portfolio,
        kind: "trades",
        response: {},
        query: {},
      }),
    ).toThrow("Unexpected trades response shape");
  });
});
