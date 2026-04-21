export type PerformanceView = "table" | "raw";

export function normalizePerformanceView(input: string): PerformanceView {
  if (input === "table" || input === "raw") {
    return input;
  }
  throw new Error(`Unsupported view '${input}'. Use table or raw.`);
}

export function renderPerformanceView(params: {
  view: PerformanceView;
  portfolioId: number;
  portfolioName: string;
  consolidated: boolean;
  grouping?: string;
  customGroupId?: number;
  report: unknown;
}): unknown {
  if (params.view === "raw") {
    return {
      portfolioId: params.portfolioId,
      portfolioName: params.portfolioName,
      consolidated: params.consolidated,
      grouping: params.grouping,
      customGroupId: params.customGroupId,
      report: params.report,
    };
  }

  return buildTableView(params);
}

function buildTableView(params: {
  portfolioId: number;
  portfolioName: string;
  consolidated: boolean;
  report: unknown;
}): unknown {
  const report = resolveReportPayload(params.report);
  if (!report) {
    throw new Error("Unexpected performance response shape. Missing report payload.");
  }

  const holdings = asArray(report.holdings);
  const subTotals = asArray(report.sub_totals);

  const holdingsByGroup = new Map<string, unknown[]>();
  for (const holding of holdings) {
    const holdingRecord = asRecord(holding);
    if (!holdingRecord) {
      continue;
    }
    const key = `${asNumber(holdingRecord.group_id) ?? -1}|${asString(holdingRecord.group_name) ?? "Ungrouped"}`;
    const existing = holdingsByGroup.get(key) ?? [];
    existing.push(formatHoldingRow(holdingRecord));
    holdingsByGroup.set(key, existing);
  }

  const groups = subTotals
    .map((subtotal): unknown => {
      const subtotalRecord = asRecord(subtotal);
      if (!subtotalRecord) {
        return undefined;
      }
      const groupId = asNumber(subtotalRecord.group_id);
      const groupName = asString(subtotalRecord.group_name);
      const key = `${groupId ?? -1}|${groupName ?? "Ungrouped"}`;
      return {
        groupId,
        groupName,
        totals: formatTotalRow(subtotalRecord),
        holdings: holdingsByGroup.get(key) ?? [],
      };
    })
    .filter((item): item is unknown => Boolean(item));

  return {
    portfolio: {
      id: params.portfolioId,
      name: params.portfolioName,
      consolidated: params.consolidated,
    },
    meta: {
      reportId: asString(report.id),
      groupedBy: asString(report.grouping),
      startDate: asString(report.start_date),
      endDate: asString(report.end_date),
      openPositionsOnly: asBoolean(report.include_sales) === false,
      percentagesAnnualised: asBoolean(report.percentages_annualised),
      currency: formatCurrency(report.currency),
    },
    totals: formatTotalRow(report),
    groups,
    cashAccounts: asArray(report.cash_accounts),
  };
}

function resolveReportPayload(input: unknown): Record<string, unknown> | undefined {
  const root = asRecord(input);
  if (!root) {
    return undefined;
  }

  const nestedReport = asRecord(root.report);
  const deeplyNestedReport = asRecord(nestedReport?.report);

  // Support common Sharesight response shapes:
  // 1) { report: { report: { ...payload } } }
  // 2) { report: { ...payload } }
  // 3) { ...payload }
  return deeplyNestedReport ?? nestedReport ?? root;
}

function formatHoldingRow(holding: Record<string, unknown>): unknown {
  const instrument = asRecord(holding.instrument);
  return {
    id: asNumber(holding.id),
    groupId: asNumber(holding.group_id),
    groupName: asString(holding.group_name),
    code: asString(instrument?.code),
    marketCode: asString(instrument?.market_code),
    name: asString(instrument?.name),
    quantity: asNumber(holding.quantity),
    value: asNumber(holding.value),
    instrumentPrice: asNumber(holding.instrument_price),
    capitalGain: asNumber(holding.capital_gain),
    payoutGain: asNumber(holding.payout_gain),
    currencyGain: asNumber(holding.currency_gain),
    totalGain: asNumber(holding.total_gain),
    capitalGainPercent: asNumber(holding.capital_gain_percent),
    payoutGainPercent: asNumber(holding.payout_gain_percent),
    currencyGainPercent: asNumber(holding.currency_gain_percent),
    totalGainPercent: asNumber(holding.total_gain_percent),
    unconfirmedTransactions: asNumber(holding.number_of_unconfirmed_transactions),
  };
}

function formatTotalRow(input: Record<string, unknown>): unknown {
  return {
    value: asNumber(input.value),
    capitalGain: asNumber(input.capital_gain),
    payoutGain: asNumber(input.payout_gain),
    currencyGain: asNumber(input.currency_gain),
    totalGain: asNumber(input.total_gain),
    capitalGainPercent: asNumber(input.capital_gain_percent),
    payoutGainPercent: asNumber(input.payout_gain_percent),
    currencyGainPercent: asNumber(input.currency_gain_percent),
    totalGainPercent: asNumber(input.total_gain_percent),
  };
}

function formatCurrency(input: unknown): unknown {
  const currency = asRecord(input);
  if (!currency) {
    return undefined;
  }
  return {
    code: asString(currency.code),
    symbol: asString(currency.symbol),
    qualifiedSymbol: asString(currency.qualified_symbol),
  };
}

function asRecord(input: unknown): Record<string, unknown> | undefined {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return undefined;
  }
  return input as Record<string, unknown>;
}

function asArray(input: unknown): unknown[] {
  return Array.isArray(input) ? input : [];
}

function asString(input: unknown): string | undefined {
  return typeof input === "string" ? input : undefined;
}

function asNumber(input: unknown): number | undefined {
  return typeof input === "number" ? input : undefined;
}

function asBoolean(input: unknown): boolean | undefined {
  return typeof input === "boolean" ? input : undefined;
}
