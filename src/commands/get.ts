import type { Command } from "commander";
import { loadCredentials } from "../auth/credentialStore.js";
import type { RuntimeConfig } from "../config.js";
import { parseOutputFormat } from "../formatters/formatOption.js";
import { printOutput } from "../formatters/output.js";
import { extractCustomGroupsFromV2GroupsResponse, resolveGroupingSelection } from "../grouping.js";
import type { HoldingSummary } from "../holdingResolver.js";
import { extractHoldingsFromResponse, resolveHoldingBySymbol } from "../holdingResolver.js";
import { SharesightClient } from "../http/sharesightClient.js";
import { renderPerformanceTableView } from "../performanceView.js";
import { resolveSelectedPortfolio } from "../portfolioSelection.js";
import { ContextStore } from "../state/contextStore.js";
import { renderTransactionListView } from "../transactionView.js";
import type { Portfolio } from "../types.js";

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
    .option("--exclude-sales", "Exclude sold positions")
    .option("--grouping <grouping>", "Performance grouping or custom group name/id")
    .option("--format <format>", "json|jsonl")
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
      if ((options.includeSales as boolean | undefined) && (options.excludeSales as boolean | undefined)) {
        throw new Error("Conflicting options: use only one of --include-sales or --exclude-sales.");
      }
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
        include_sales: resolveIncludeSalesOption({
          includeSales: options.includeSales as boolean | undefined,
          excludeSales: options.excludeSales as boolean | undefined,
          defaultIncludeSales: context.defaultIncludeSales,
        }),
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
      printOutput(output, parseOutputFormat(options.format as string | undefined, context.defaultFormat));
    });

  get
    .command("trades")
    .description("Get Sharesight trades")
    .option("--portfolio <id-or-name>", "Portfolio ID or exact name")
    .option("--holding <symbol[.market]>", "Holding symbol, optionally qualified with market")
    .option("--start-date <date>", "Start date (YYYY-MM-DD)")
    .option("--end-date <date>", "End date (YYYY-MM-DD)")
    .option("--unique-identifier <id>", "Search for trade with unique identifier")
    .option("--format <format>", "json|jsonl")
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
      const holding = await resolveOptionalHolding({
        holdingInput: options.holding as string | undefined,
        selectedPortfolio: selected,
        client,
        credentials,
      });
      const query = {
        start_date: options.startDate as string | undefined,
        end_date: options.endDate as string | undefined,
        unique_identifier: options.uniqueIdentifier as string | undefined,
      };
      const response = holding
        ? await client.getHoldingTrades(credentials, holding.id, query)
        : await client.getPortfolioTrades(credentials, selected.id, query);
      printOutput(
        renderTransactionListView({
          portfolio: selected,
          holding,
          kind: "trades",
          response,
          query,
        }),
        parseOutputFormat(options.format as string | undefined, context.defaultFormat),
      );
    });

  get
    .command("payouts")
    .description("Get Sharesight payouts")
    .option("--portfolio <id-or-name>", "Portfolio ID or exact name")
    .option("--holding <symbol[.market]>", "Holding symbol, optionally qualified with market")
    .option("--start-date <date>", "Start date (YYYY-MM-DD)")
    .option("--end-date <date>", "End date (YYYY-MM-DD)")
    .option("--use-date <paid_on|ex_date>", "Date field to use when filtering payouts")
    .option("--format <format>", "json|jsonl")
    .action(async (options) => {
      const useDate = parsePayoutUseDate(options.useDate as string | undefined);
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
      const holding = await resolveOptionalHolding({
        holdingInput: options.holding as string | undefined,
        selectedPortfolio: selected,
        client,
        credentials,
      });
      const query = {
        start_date: options.startDate as string | undefined,
        end_date: options.endDate as string | undefined,
        use_date: useDate,
      };
      const response = holding
        ? await client.getHoldingPayouts(credentials, holding.id, query)
        : await client.getPortfolioPayouts(credentials, selected.id, query);
      printOutput(
        renderTransactionListView({
          portfolio: selected,
          holding,
          kind: "payouts",
          response,
          query,
        }),
        parseOutputFormat(options.format as string | undefined, context.defaultFormat),
      );
    });
}

function resolveIncludeSalesOption(params: {
  includeSales?: boolean;
  excludeSales?: boolean;
  defaultIncludeSales?: boolean;
}): string | undefined {
  if (params.includeSales) {
    return "true";
  }
  if (params.excludeSales) {
    return "false";
  }
  if (typeof params.defaultIncludeSales === "boolean") {
    return params.defaultIncludeSales ? "true" : "false";
  }
  return undefined;
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

async function resolveOptionalHolding(params: {
  holdingInput?: string;
  selectedPortfolio: Portfolio;
  client: SharesightClient;
  credentials: Awaited<ReturnType<typeof loadCredentials>>;
}): Promise<HoldingSummary | undefined> {
  if (!params.holdingInput) {
    return undefined;
  }

  const response = await params.client.listPortfolioHoldings(
    params.credentials,
    params.selectedPortfolio.id,
    params.selectedPortfolio.consolidated,
  );
  return resolveHoldingBySymbol(params.holdingInput, extractHoldingsFromResponse(response));
}

function parsePayoutUseDate(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }
  if (value === "paid_on" || value === "ex_date") {
    return value;
  }
  throw new Error("Invalid --use-date value. Use paid_on or ex_date.");
}
