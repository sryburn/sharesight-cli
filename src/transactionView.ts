import type { HoldingSummary } from "./holdingResolver.js";
import type { Portfolio } from "./types.js";

export type TransactionKind = "trades" | "payouts";

export function renderTransactionListView(params: {
  portfolio: Portfolio;
  holding?: HoldingSummary;
  kind: TransactionKind;
  response: unknown;
  query: Record<string, string | undefined>;
}): unknown {
  const transactions = resolveTransactionArray(params.response, params.kind);
  return {
    portfolio: {
      id: params.portfolio.id,
      name: params.portfolio.name,
      consolidated: params.portfolio.consolidated,
    },
    holding: params.holding
      ? {
          id: params.holding.id,
          symbol: params.holding.symbol,
          market: params.holding.market,
          name: params.holding.name,
        }
      : undefined,
    meta: {
      source: params.holding ? "holding" : "portfolio",
      startDate: params.query.start_date,
      endDate: params.query.end_date,
      useDate: params.query.use_date,
      uniqueIdentifier: params.query.unique_identifier,
      count: transactions.length,
    },
    [params.kind]: transactions,
  };
}

function resolveTransactionArray(response: unknown, kind: TransactionKind): unknown[] {
  const root = asRecord(response);
  if (!root) {
    throw new Error(`Unexpected ${kind} response shape. Missing ${kind} payload.`);
  }

  const transactions = root[kind];
  if (!Array.isArray(transactions)) {
    throw new Error(`Unexpected ${kind} response shape. Missing ${kind} payload.`);
  }
  return transactions;
}

function asRecord(input: unknown): Record<string, unknown> | undefined {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return undefined;
  }
  return input as Record<string, unknown>;
}
