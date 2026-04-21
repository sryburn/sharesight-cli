import type { Portfolio } from "./types.js";

export function resolvePortfolioByIdOrName(input: string, portfolios: Portfolio[]): Portfolio {
  const numeric = Number(input);
  if (Number.isInteger(numeric)) {
    const byId = portfolios.find((p) => p.id === numeric);
    if (byId) {
      return byId;
    }
  }

  const exactNameMatches = portfolios.filter((p) => p.name === input);
  if (exactNameMatches.length === 1) {
    return exactNameMatches[0]!;
  }
  if (exactNameMatches.length > 1) {
    const ids = exactNameMatches.map((p) => p.id).join(", ");
    throw new Error(`Portfolio name is ambiguous. Matching IDs: ${ids}`);
  }

  throw new Error(`No portfolio found for '${input}'.`);
}
