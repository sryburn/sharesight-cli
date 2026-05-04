import type { Command } from "commander";
import { loadCredentials } from "../auth/credentialStore.js";
import type { RuntimeConfig } from "../config.js";
import { parseOutputFormat } from "../formatters/formatOption.js";
import { printOutput } from "../formatters/output.js";
import { extractCustomGroupsFromV2GroupsResponse, VALID_PERFORMANCE_GROUPINGS } from "../grouping.js";
import { renderHoldingListView } from "../holdingView.js";
import { SharesightClient } from "../http/sharesightClient.js";
import { resolveSelectedPortfolio } from "../portfolioSelection.js";
import { ContextStore } from "../state/contextStore.js";

export function registerListCommands(program: Command, getConfig: () => RuntimeConfig): void {
  const list = program.command("list").description("List portfolios, holdings, and groupings");
  const contextStore = new ContextStore();

  list
    .command("portfolios")
    .description("List portfolios")
    .option("--format <format>", "json|jsonl", "json")
    .action(async (options) => {
      const config = getConfig();
      const client = new SharesightClient(config);
      const credentials = await loadCredentials();
      const portfolios = await client.listAllPortfolios(credentials);
      printOutput(portfolios, parseOutputFormat(options.format));
    });

  list
    .command("holdings")
    .description("List holdings for a portfolio")
    .option("--portfolio <id-or-name>", "Portfolio ID or exact name")
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
      const response = await client.listPortfolioHoldings(
        credentials,
        selected.id,
        selected.consolidated,
      );
      printOutput(renderHoldingListView({ portfolio: selected, response }), parseOutputFormat(options.format));
    });

  list
    .command("groupings")
    .description("List supported grouping values and custom groupings")
    .option("--format <format>", "json|jsonl", "json")
    .action(async (options) => {
      const config = getConfig();
      const client = new SharesightClient(config);
      const credentials = await loadCredentials();
      const response = await client.listGroups(credentials);
      const customGroups = extractCustomGroupsFromV2GroupsResponse(response);
      printOutput(
        {
          defaultGroupings: VALID_PERFORMANCE_GROUPINGS,
          customGroupings: customGroups,
        },
        parseOutputFormat(options.format),
      );
    });
}
