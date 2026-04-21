import type { Command } from "commander";
import { loadCredentials } from "../auth/credentialStore.js";
import type { RuntimeConfig } from "../config.js";
import { printOutput } from "../formatters/output.js";
import { SharesightClient } from "../http/sharesightClient.js";
import { resolvePortfolioByIdOrName } from "../portfolioResolver.js";
import { ContextStore } from "../state/contextStore.js";
import type { OutputFormat } from "../types.js";

export function registerPortfolioCommands(
  program: Command,
  getConfig: () => RuntimeConfig,
): void {
  const portfolio = program.command("portfolio").description("Portfolio helper commands");
  const contextStore = new ContextStore();

  portfolio
    .command("list")
    .description("List portfolios")
    .option("--format <format>", "json|jsonl", "json")
    .action(async (options) => {
      const config = getConfig();
      const client = new SharesightClient(config);
      const credentials = await loadCredentials();
      const portfolios = await client.listAllPortfolios(credentials);
      printOutput(portfolios, normalizeFormat(options.format));
    });

  portfolio
    .command("use")
    .description("Set default portfolio by id or exact name")
    .argument("[portfolio]", "Portfolio ID or exact name")
    .option("--portfolio <id-or-name>", "Portfolio ID or exact name")
    .action(async (portfolioArg, options) => {
      const portfolioInput = portfolioArg ?? options.portfolio;
      if (!portfolioInput) {
        throw new Error(
          "Missing portfolio value. Use `sharesight portfolio use <id-or-name>` or `--portfolio <id-or-name>`.",
        );
      }

      const config = getConfig();
      const client = new SharesightClient(config);
      const credentials = await loadCredentials();
      const portfolios = await client.listAllPortfolios(credentials);
      const selected = resolvePortfolioByIdOrName(portfolioInput, portfolios);
      await contextStore.write({
        defaultPortfolioId: selected.id,
        defaultPortfolioName: selected.name,
        defaultPortfolioConsolidated: selected.consolidated,
      });
      process.stdout.write(`Default portfolio set to ${selected.name} (${selected.id}).\n`);
    });
}

function normalizeFormat(input: string): OutputFormat {
  if (input === "json" || input === "jsonl") {
    return input;
  }
  throw new Error(`Unsupported format '${input}'. Use json or jsonl.`);
}
