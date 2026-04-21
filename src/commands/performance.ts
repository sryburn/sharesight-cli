import type { Command } from "commander";
import { loadCredentials } from "../auth/credentialStore.js";
import type { RuntimeConfig } from "../config.js";
import { printOutput } from "../formatters/output.js";
import { SharesightClient } from "../http/sharesightClient.js";
import { resolvePortfolioForCommand } from "../portfolioResolver.js";
import { ContextStore } from "../state/contextStore.js";
import type { OutputFormat } from "../types.js";

export function registerPerformanceCommand(
  program: Command,
  getConfig: () => RuntimeConfig,
): void {
  const contextStore = new ContextStore();
  program
    .command("performance")
    .description("Show Sharesight portfolio performance report")
    .option("--portfolio <id-or-name>", "Portfolio ID or exact name")
    .option("--from <date>", "Start date (YYYY-MM-DD)")
    .option("--to <date>", "End date (YYYY-MM-DD)")
    .option("--period <period>", "Sharesight period value")
    .option("--format <format>", "json|jsonl", "json")
    .action(async (options) => {
      const config = getConfig();
      const client = new SharesightClient(config);
      const credentials = await loadCredentials();
      const portfolios = await client.listPortfolios(credentials);
      const selected = await resolvePortfolioForCommand({
        explicitValue: options.portfolio,
        portfolios,
        contextStore,
      });

      const performance = await client.getPerformance(credentials, selected.id, {
        from: options.from,
        to: options.to,
        period: options.period,
      });
      printOutput(
        {
          portfolioId: selected.id,
          portfolioName: selected.name,
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
