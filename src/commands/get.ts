import type { Command } from "commander";
import { loadCredentials } from "../auth/credentialStore.js";
import type { RuntimeConfig } from "../config.js";
import { printOutput } from "../formatters/output.js";
import { extractCustomGroupsFromV2GroupsResponse, resolveGroupingSelection } from "../grouping.js";
import { SharesightClient } from "../http/sharesightClient.js";
import { renderPerformanceTableView } from "../performanceView.js";
import { resolvePortfolioByIdOrName } from "../portfolioResolver.js";
import { ContextStore } from "../state/contextStore.js";
import type { OutputFormat, Portfolio } from "../types.js";

export function registerGetCommands(program: Command, getConfig: () => RuntimeConfig): void {
  const get = program.command("get").description("Get Sharesight reports and data");
  const contextStore = new ContextStore();

  get
    .command("performance")
    .description("Get Sharesight portfolio performance report")
    .option("--portfolio <id-or-name>", "Portfolio ID or exact name")
    .option("--start-date <date>", "Start date (YYYY-MM-DD)")
    .option("--end-date <date>", "End date (YYYY-MM-DD)")
    .option("--include-sales", "Include sold positions")
    .option("--grouping <grouping>", "Performance grouping or custom group name/id")
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
      const context = await contextStore.read();
      const grouping = await resolveGroupingSelection({
        explicitGrouping: options.grouping as string | undefined,
        defaultGrouping: context.defaultGrouping,
        defaultCustomGroupId: context.defaultCustomGroupId,
        loadCustomGroups: async () => {
          const response = await client.listGroups(credentials);
          return extractCustomGroupsFromV2GroupsResponse(response);
        },
      });
      await assertCustomGroupingAccess({
        selectedPortfolio: selected,
        grouping: grouping.grouping,
        client,
        credentials,
      });

      const performance = await client.getPerformance(credentials, selected.id, {
        start_date: options.startDate,
        end_date: options.endDate,
        include_sales: options.includeSales ? "true" : undefined,
        grouping: grouping.grouping,
        custom_group_id: grouping.customGroupId ? String(grouping.customGroupId) : undefined,
        consolidated: selected.consolidated ? "true" : undefined,
      });
      const output = renderPerformanceTableView({
        portfolioId: selected.id,
        portfolioName: selected.name,
        consolidated: selected.consolidated,
        report: performance,
      });
      printOutput(output, normalizeFormat(options.format));
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
      access_level: state.defaultPortfolioAccessLevel,
    };
  }

  throw new Error(
    "No default portfolio set. Run `sharesight defaults set --portfolio <id-or-name>` or pass --portfolio.",
  );
}

async function assertCustomGroupingAccess(params: {
  selectedPortfolio: Portfolio;
  grouping?: string;
  client: SharesightClient;
  credentials: Awaited<ReturnType<typeof loadCredentials>>;
}): Promise<void> {
  if (params.grouping !== "custom_group") {
    return;
  }

  const accessLevel = await resolveAccessLevel(params);
  if (accessLevel === "OWNER") {
    return;
  }

  throw new Error(
    `Custom grouping requires portfolio access_level OWNER. Selected portfolio has access_level ${accessLevel ?? "UNKNOWN"}. Use a default grouping or choose an OWNER portfolio.`,
  );
}

async function resolveAccessLevel(params: {
  selectedPortfolio: Portfolio;
  client: SharesightClient;
  credentials: Awaited<ReturnType<typeof loadCredentials>>;
}): Promise<string | undefined> {
  const direct = readAccessLevel(params.selectedPortfolio);
  if (direct) {
    return direct;
  }

  const portfolios = await params.client.listAllPortfolios(params.credentials);
  const matched = portfolios.find((portfolio) => portfolio.id === params.selectedPortfolio.id);
  if (!matched) {
    return undefined;
  }

  return readAccessLevel(matched);
}

function readAccessLevel(portfolio: Portfolio): string | undefined {
  const value = portfolio.access_level;
  return typeof value === "string" ? value : undefined;
}
