import type { Command } from "commander";
import { loadCredentials } from "../auth/credentialStore.js";
import type { RuntimeConfig } from "../config.js";
import { printOutput } from "../formatters/output.js";
import { extractCustomGroupsFromV2GroupsResponse, resolveGroupingSelection } from "../grouping.js";
import { SharesightClient } from "../http/sharesightClient.js";
import { resolvePortfolioByIdOrName } from "../portfolioResolver.js";
import { ContextStore } from "../state/contextStore.js";
import type { OutputFormat } from "../types.js";

export function registerDefaultsCommands(
  program: Command,
  getConfig: () => RuntimeConfig,
): void {
  const defaults = program.command("defaults").description("Manage default portfolio and grouping");
  const contextStore = new ContextStore();

  defaults
    .command("show")
    .description("Show current defaults")
    .option("--format <format>", "json|jsonl", "json")
    .action(async (options) => {
      const state = await contextStore.read();
      printOutput(
        {
          portfolio: state.defaultPortfolioId
            ? {
                id: state.defaultPortfolioId,
                name: state.defaultPortfolioName ?? `Portfolio ${state.defaultPortfolioId}`,
                consolidated: state.defaultPortfolioConsolidated ?? false,
                accessLevel: state.defaultPortfolioAccessLevel,
              }
            : undefined,
          grouping: state.defaultGrouping
            ? {
                value: state.defaultGrouping,
                customGroupId: state.defaultCustomGroupId,
              }
            : undefined,
          includeSales: state.defaultIncludeSales,
          format: state.defaultFormat,
        },
        normalizeFormat(options.format),
      );
    });

  defaults
    .command("set")
    .description("Set default portfolio and/or grouping")
    .option("--portfolio <id-or-name>", "Default portfolio ID or exact name")
    .option("--grouping <grouping>", "Default grouping or custom group name/id")
    .option("--include-sales", "Default to including sold positions")
    .option("--exclude-sales", "Default to excluding sold positions")
    .option("--format <format>", "Default output format: json|jsonl")
    .action(async (options) => {
      const portfolioInput = options.portfolio as string | undefined;
      const groupingInput = options.grouping as string | undefined;
      const includeSales = options.includeSales as boolean | undefined;
      const excludeSales = options.excludeSales as boolean | undefined;
      const formatInput = options.format as string | undefined;
      if (includeSales && excludeSales) {
        throw new Error("Conflicting options: use only one of --include-sales or --exclude-sales.");
      }
      if (!portfolioInput && !groupingInput && !includeSales && !excludeSales && !formatInput) {
        throw new Error(
          "No defaults specified. Provide one or more of --portfolio, --grouping, --include-sales/--exclude-sales, or --format.",
        );
      }

      const config = getConfig();
      const client = new SharesightClient(config);
      const credentials = await loadCredentials();
      const current = await contextStore.read();

      let portfolioDefaults = {
        defaultPortfolioId: current.defaultPortfolioId,
        defaultPortfolioName: current.defaultPortfolioName,
        defaultPortfolioConsolidated: current.defaultPortfolioConsolidated,
        defaultPortfolioAccessLevel: current.defaultPortfolioAccessLevel,
      };
      if (portfolioInput) {
        const portfolios = await client.listAllPortfolios(credentials);
        const selected = resolvePortfolioByIdOrName(portfolioInput, portfolios);
        portfolioDefaults = {
          defaultPortfolioId: selected.id,
          defaultPortfolioName: selected.name,
          defaultPortfolioConsolidated: selected.consolidated,
          defaultPortfolioAccessLevel: readAccessLevel(selected),
        };
      }

      let groupingDefaults = {
        defaultGrouping: current.defaultGrouping,
        defaultCustomGroupId: current.defaultCustomGroupId,
      };
      if (groupingInput) {
        const grouping = await resolveGroupingSelection({
          explicitGrouping: groupingInput,
          loadCustomGroups: async () => {
            const response = await client.listGroups(credentials);
            return extractCustomGroupsFromV2GroupsResponse(response);
          },
        });
        groupingDefaults = {
          defaultGrouping: grouping.grouping,
          defaultCustomGroupId: grouping.customGroupId,
        };
      }

      const includeSalesDefault =
        includeSales ? true : excludeSales ? false : current.defaultIncludeSales;
      const defaultFormat = formatInput ? normalizeFormat(formatInput) : current.defaultFormat;

      await contextStore.write({
        ...current,
        ...portfolioDefaults,
        ...groupingDefaults,
        defaultIncludeSales: includeSalesDefault,
        defaultFormat,
      });

      process.stdout.write("Defaults updated.\n");
    });
}

function readAccessLevel(portfolio: { [key: string]: unknown }): string | undefined {
  const value = portfolio.access_level;
  return typeof value === "string" ? value : undefined;
}

function normalizeFormat(input: string): OutputFormat {
  if (input === "json" || input === "jsonl") {
    return input;
  }
  throw new Error(`Unsupported format '${input}'. Use json or jsonl.`);
}
