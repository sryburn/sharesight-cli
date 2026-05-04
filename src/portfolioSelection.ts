import type { Credentials, Portfolio } from "./types.js";
import type { SharesightClient } from "./http/sharesightClient.js";
import { resolvePortfolioByIdOrName } from "./portfolioResolver.js";
import type { ContextStore } from "./state/contextStore.js";

export async function resolveSelectedPortfolio(params: {
  explicitValue?: string;
  client: SharesightClient;
  credentials: Credentials;
  contextStore: ContextStore;
}): Promise<Portfolio> {
  if (params.explicitValue) {
    const portfolios = await params.client.listAllPortfolios(params.credentials);
    return resolvePortfolioByIdOrName(params.explicitValue, portfolios);
  }

  const state = await params.contextStore.read();
  if (state.defaultPortfolioId && typeof state.defaultPortfolioConsolidated === "boolean") {
    return {
      id: state.defaultPortfolioId,
      name: state.defaultPortfolioName ?? `Portfolio ${state.defaultPortfolioId}`,
      consolidated: state.defaultPortfolioConsolidated,
      access_level: state.defaultPortfolioAccessLevel,
    };
  }

  throw new Error(
    "No default portfolio set. Run `sharesight defaults set --portfolio <id-or-name>` or pass --portfolio.",
  );
}
