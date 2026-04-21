import { describe, expect, it } from "vitest";
import { resolvePortfolioByIdOrName } from "../src/portfolioResolver.js";

const portfolios = [
  { id: 1, name: "Main Portfolio", consolidated: false },
  { id: 2, name: "Retirement", consolidated: true },
];

describe("resolvePortfolioByIdOrName", () => {
  it("resolves by id", () => {
    expect(resolvePortfolioByIdOrName("1", portfolios)).toEqual(portfolios[0]);
  });

  it("resolves by exact name", () => {
    expect(resolvePortfolioByIdOrName("Retirement", portfolios)).toEqual(portfolios[1]);
  });

  it("throws for unknown value", () => {
    expect(() => resolvePortfolioByIdOrName("Unknown", portfolios)).toThrow(
      "No portfolio found",
    );
  });
});
