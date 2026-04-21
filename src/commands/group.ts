import type { Command } from "commander";
import { loadCredentials } from "../auth/credentialStore.js";
import type { RuntimeConfig } from "../config.js";
import { printOutput } from "../formatters/output.js";
import {
  extractCustomGroupsFromV2GroupsResponse,
  resolveGroupingSelection,
  VALID_PERFORMANCE_GROUPINGS,
} from "../grouping.js";
import { SharesightClient } from "../http/sharesightClient.js";
import { ContextStore } from "../state/contextStore.js";
import type { OutputFormat } from "../types.js";

export function registerGroupCommands(
  program: Command,
  getConfig: () => RuntimeConfig,
): void {
  const group = program.command("group").description("Grouping helper commands");
  const contextStore = new ContextStore();

  group
    .command("list")
    .description("List supported grouping values and custom groups")
    .option("--format <format>", "json|jsonl", "json")
    .action(async (options) => {
      const config = getConfig();
      const client = new SharesightClient(config);
      const credentials = await loadCredentials();
      const response = await client.listGroups(credentials);
      const customGroups = extractCustomGroupsFromV2GroupsResponse(response);
      printOutput(
        {
          defaultGroups: VALID_PERFORMANCE_GROUPINGS,
          customGroups,
        },
        normalizeFormat(options.format),
      );
    });

  group
    .command("use")
    .description("Set default performance grouping")
    .argument("<grouping>", "Grouping value or custom group name/id")
    .action(async (groupingArg) => {
      const config = getConfig();
      const client = new SharesightClient(config);
      const credentials = await loadCredentials();
      const grouping = await resolveGroupingSelection({
        explicitGrouping: groupingArg,
        loadCustomGroups: async () => {
          const response = await client.listGroups(credentials);
          return extractCustomGroupsFromV2GroupsResponse(response);
        },
      });

      const current = await contextStore.read();
      await contextStore.write({
        ...current,
        defaultGrouping: grouping.grouping,
        defaultCustomGroupId: grouping.customGroupId,
      });

      const customGroupSuffix = grouping.customGroupId
        ? ` (custom group id: ${grouping.customGroupId})`
        : "";
      process.stdout.write(`Default grouping set to ${grouping.grouping}${customGroupSuffix}.\n`);
    });

  group
    .command("show")
    .description("Show current default grouping")
    .action(async () => {
      const current = await contextStore.read();
      if (!current.defaultGrouping) {
        process.stdout.write(
          `No default grouping set. Valid values: ${VALID_PERFORMANCE_GROUPINGS.join(", ")}.\n`,
        );
        return;
      }

      const customGroupSuffix = current.defaultCustomGroupId
        ? ` (custom group id: ${current.defaultCustomGroupId})`
        : "";
      process.stdout.write(`Default grouping: ${current.defaultGrouping}${customGroupSuffix}\n`);
    });
}

function normalizeFormat(input: string): OutputFormat {
  if (input === "json" || input === "jsonl") {
    return input;
  }
  throw new Error(`Unsupported format '${input}'. Use json or jsonl.`);
}
