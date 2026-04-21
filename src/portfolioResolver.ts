import type { ContextStore } from "./state/contextStore.js";
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

export async function resolvePortfolioForCommand(params: {
  explicitValue?: string;
  portfolios: Portfolio[];
  contextStore: ContextStore;
}): Promise<Portfolio> {
  if (params.explicitValue) {
    return resolvePortfolioByIdOrName(params.explicitValue, params.portfolios);
  }

  const state = await params.contextStore.read();
  if (state.defaultPortfolioId) {
    const byId = params.portfolios.find((p) => p.id === state.defaultPortfolioId);
    if (byId) {
      return byId;
    }
  }

  throw new Error(
    "No portfolio selected. Use --portfolio <id-or-name> or run `sharesight portfolio use --portfolio <id-or-name>`.",
  );
}
