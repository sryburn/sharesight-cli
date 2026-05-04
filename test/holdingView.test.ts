import { describe, expect, it } from "vitest";
import { renderHoldingListView } from "../src/holdingView.js";

describe("renderHoldingListView", () => {
  it("renders flat holding rows with top-level portfolio context", () => {
    expect(
      renderHoldingListView({
        portfolio: { id: 123, name: "Main", consolidated: false },
        response: {
          holdings: [
            {
              id: "10036710,",
              symbol: "AAPL",
              currency_code: "USD",
              quantity: 10,
              value: 2500.5,
              average_buy_price: 125.25,
              portfolio_id: 123,
              tax_residency_country_code: "NZ",
              unconfirmed: false,
              portfolio: {
                id: 123,
                name: "Main",
              },
              instrument: {
                code: "AAPL",
                country_id: 49,
                market_code: "NASDAQ",
                name: "Apple Inc",
                sector_classification_name: "Information Technology",
                industry_classification_name: "Technology Hardware",
                friendly_instrument_description_code: "Apple Inc (AAPL.NASDAQ)",
                delisted: false,
                logo_url: "https://example.test/aapl.png",
                logo_urls: [
                  "https://example.test/aapl-small.png",
                  "https://example.test/aapl-large.png",
                ],
                logo: {
                  small_url: "https://example.test/aapl-logo-small.png",
                  large_url: "https://example.test/aapl-logo-large.png",
                },
              },
              instrument_currency: {
                id: 840,
                code: "USD",
                symbol: "$",
                qualified_symbol: "US$",
              },
              labels: [{ id: 9, name: "Core", color: "#ff0000" }],
            },
          ],
        },
      }),
    ).toEqual({
      portfolio: {
        id: 123,
        name: "Main",
        consolidated: false,
      },
      meta: {
        count: 1,
      },
      holdings: [
        {
          id: 10036710,
          symbol: "AAPL",
          currencyCode: "USD",
          quantity: 10,
          value: 2500.5,
          averageBuyPrice: 125.25,
          taxResidencyCountryCode: "NZ",
          unconfirmed: false,
          market: "NASDAQ",
          name: "Apple Inc",
          sectorClassificationName: "Information Technology",
          industryClassificationName: "Technology Hardware",
          countryCode: "US",
          delisted: false,
          logoUrl: "https://example.test/aapl.png",
          logoUrls: [
            "https://example.test/aapl-small.png",
            "https://example.test/aapl-large.png",
          ],
          logoSmallUrl: "https://example.test/aapl-logo-small.png",
          logoLargeUrl: "https://example.test/aapl-logo-large.png",
          currencySymbol: "$",
          currencyQualifiedSymbol: "US$",
          labels: ["Core"],
          labelIds: [9],
          labelDetails: [{ id: 9, name: "Core", color: "#ff0000" }],
        },
      ],
    });
    const holding = (
      renderHoldingListView({
        portfolio: { id: 123, name: "Main", consolidated: false },
        response: {
          holdings: [
            {
              id: 1,
              symbol: "AAPL",
              market: "NASDAQ",
              name: "Apple Inc",
              quantity: 10,
            },
          ],
        },
      }) as { holdings: Array<Record<string, unknown>> }
    ).holdings[0];

    expect(Object.keys(holding).slice(0, 4)).toEqual(["id", "symbol", "market", "name"]);
  });

  it("groups instrument and currency attributes after other holding attributes", () => {
    const holding = (
      renderHoldingListView({
        portfolio: { id: 123, name: "Main", consolidated: false },
        response: {
          holdings: [
            {
              id: 1,
              symbol: "AAPL",
              market: "NASDAQ",
              name: "Apple Inc",
              quantity: 10,
              instrument: {
                country_id: 49,
                logo_url: "https://example.test/aapl.png",
              },
              instrument_currency: {
                code: "USD",
                symbol: "$",
              },
            },
          ],
        },
      }) as { holdings: Array<Record<string, unknown>> }
    ).holdings[0];
    const keys = Object.keys(holding);

    expect(keys.slice(0, 5)).toEqual(["id", "symbol", "market", "name", "quantity"]);
    expect(keys.indexOf("quantity")).toBeLessThan(keys.indexOf("countryCode"));
    expect(keys.indexOf("logoUrl")).toBeLessThan(keys.indexOf("currencyCode"));
    expect(keys.slice(-2)).toEqual(["currencyCode", "currencySymbol"]);
  });

  it("does not repeat portfolio attributes on each holding", () => {
    const holding = (
      renderHoldingListView({
        portfolio: { id: 123, name: "Main", consolidated: false },
        response: {
          holdings: [
            {
              id: 1,
              portfolio_id: 123,
              portfolio: {
                id: 123,
                name: "Main",
              },
            },
          ],
        },
      }) as { holdings: Array<Record<string, unknown>> }
    ).holdings[0];

    expect(holding).not.toHaveProperty("portfolioId");
    expect(holding).not.toHaveProperty("portfolioName");
  });

  it("omits noisy flattened holding fields", () => {
    const holding = (
      renderHoldingListView({
        portfolio: { id: 123, name: "Main", consolidated: false },
        response: {
          holdings: [
            {
              id: 1,
              expires_on: "2026-01-01",
              expired: false,
              tz_name: "Pacific/Auckland",
              instrument: {
                friendly_instrument_description_code: "Apple Inc (AAPL.NASDAQ)",
                country_id: 14,
                supported_denominations: ["USD"],
                crypto: false,
                currency_code: "USD",
                expires_on: "2026-01-01",
                expired: false,
                tz_name: "America/New_York",
              },
              instrument_currency: {
                id: 840,
              },
            },
          ],
        },
      }) as { holdings: Array<Record<string, unknown>> }
    ).holdings[0];

    expect(holding).not.toHaveProperty("instrumentFriendlyInstrumentDescriptionCode");
    expect(holding).not.toHaveProperty("instrumentCountryId");
    expect(holding).not.toHaveProperty("instrumentSupportedDenominations");
    expect(holding).not.toHaveProperty("instrumentCrypto");
    expect(holding).not.toHaveProperty("instrumentCurrencyCode");
    expect(holding).not.toHaveProperty("currencyId");
    expect(holding).not.toHaveProperty("expiresOn");
    expect(holding).not.toHaveProperty("expired");
    expect(holding).not.toHaveProperty("instrumentExpiresOn");
    expect(holding).not.toHaveProperty("instrumentExpired");
    expect(holding).not.toHaveProperty("tzName");
    expect(holding).not.toHaveProperty("instrumentTzName");
    expect(holding.countryCode).toBe("AS");
  });

  it("uses hardcoded country reference for instrument country IDs", () => {
    const holding = (
      renderHoldingListView({
        portfolio: { id: 123, name: "Main", consolidated: false },
        response: {
          holdings: [
            {
              id: 1,
              instrument: {
                country_id: 2,
              },
            },
          ],
        },
      }) as { holdings: Array<Record<string, unknown>> }
    ).holdings[0];

    expect(holding).not.toHaveProperty("instrumentCountryId");
    expect(holding.countryCode).toBe("AU");
  });

  it("keeps the instrument prefix for instrument ID", () => {
    const holding = (
      renderHoldingListView({
        portfolio: { id: 123, name: "Main", consolidated: false },
        response: {
          holdings: [
            {
              id: 1,
              instrument: {
                id: 456,
                country_id: 49,
              },
            },
          ],
        },
      }) as { holdings: Array<Record<string, unknown>> }
    ).holdings[0];

    expect(holding.instrumentId).toBe(456);
    expect(holding.countryCode).toBe("US");
  });

  it("uses nested instrument values only when top-level fields are absent", () => {
    expect(
      renderHoldingListView({
        portfolio: {
          id: 123,
          name: "Main",
          consolidated: false,
        },
        response: {
          holdings: [
            {
              id: 1,
              instrument: {
                code: "VAS",
                market_code: "ASX",
                name: "Vanguard Australian Shares Index ETF",
              },
            },
          ],
        },
      }),
    ).toMatchObject({
      holdings: [
        {
          id: 1,
          symbol: "VAS",
          market: "ASX",
          name: "Vanguard Australian Shares Index ETF",
        },
      ],
    });
  });
});
