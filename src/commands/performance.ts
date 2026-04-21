import type { Command } from "commander";
import { loadCredentials } from "../auth/credentialStore.js";
import type { RuntimeConfig } from "../config.js";
import { printOutput } from "../formatters/output.js";
import { SharesightClient } from "../http/sharesightClient.js";
import { resolvePortfolioByIdOrName } from "../portfolioResolver.js";
import { ContextStore } from "../state/contextStore.js";
import type { OutputFormat, Portfolio } from "../types.js";

export function registerPerformanceCommand(
  program: Command,
  getConfig: () => RuntimeConfig,
): void {
  const contextStore = new ContextStore();
  program
    .command("performance")
    .description("Show Sharesight portfolio performance report")
    .option("--portfolio <id-or-name>", "Portfolio ID or exact name")
    .option("--start-date <date>", "Start date (YYYY-MM-DD)")
    .option("--end-date <date>", "End date (YYYY-MM-DD)")
    .option("--include-sales", "Include sold positions")
    .option("--period <period>", "Sharesight period value")
    .option("--format <format>", "json|jsonl", "json")
    .action(async (options) => {
      const config = getConfig();
      const client = new SharesightClient(config);
      const credentials = await loadCredentials();
      const selected = await resolveSelectedPortfolio({
        explicitValue: options.portfolio as string | undefined,
        client,
        credentials,
        contextStore,
      });

      const performance = await client.getPerformance(credentials, selected.id, {
        start_date: options.startDate,
        end_date: options.endDate,
        include_sales: options.includeSales ? "true" : undefined,
        consolidated: selected.consolidated ? "true" : undefined,
        period: options.period,
      });
      printOutput(
        {
          portfolioId: selected.id,
          portfolioName: selected.name,
          consolidated: selected.consolidated,
          report: performance,
        },
        normalizeFormat(options.format),
      );
    });
}

function normalizeFormat(input: string): OutputFormat {
  if (input === "json" || input === "jsonl") {
    return input;
  }
  throw new Error(`Unsupported format '${input}'. Use json or jsonl.`);
}

async function resolveSelectedPortfolio(params: {
  explicitValue?: string;
  client: SharesightClient;
  credentials: Awaited<ReturnType<typeof loadCredentials>>;
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
    };
  }

  throw new Error(
    "No portfolio selected. Use --portfolio <id-or-name> or run `sharesight portfolio use --portfolio <id-or-name>`.",
  );
}
