import type { Command } from "commander";
import { loadCredentials } from "../auth/credentialStore.js";
import type { RuntimeConfig } from "../config.js";
import { printOutput } from "../formatters/output.js";
import { extractCustomGroupsFromV2GroupsResponse, VALID_PERFORMANCE_GROUPINGS } from "../grouping.js";
import { SharesightClient } from "../http/sharesightClient.js";
import type { OutputFormat } from "../types.js";

export function registerListCommands(program: Command, getConfig: () => RuntimeConfig): void {
  const list = program.command("list").description("List portfolios and groupings");

  list
    .command("portfolios")
    .description("List portfolios")
    .option("--format <format>", "json|jsonl", "json")
    .action(async (options) => {
      const config = getConfig();
      const client = new SharesightClient(config);
      const credentials = await loadCredentials();
      const portfolios = await client.listAllPortfolios(credentials);
      printOutput(portfolios, normalizeFormat(options.format));
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
