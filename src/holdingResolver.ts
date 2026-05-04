export interface HoldingSummary {
  id: number;
  symbol: string;
  market: string;
  name?: string;
}

interface HoldingSelector {
  symbol: string;
  market?: string;
}

export function parseHoldingSelector(input: string): HoldingSelector {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("Holding must be a symbol or symbol.market value.");
  }

  const separatorIndex = trimmed.lastIndexOf(".");
  if (separatorIndex === -1) {
    return { symbol: trimmed };
  }

  const symbol = trimmed.slice(0, separatorIndex).trim();
  const market = trimmed.slice(separatorIndex + 1).trim();
  if (!symbol || !market) {
    throw new Error("Holding must be a symbol or symbol.market value.");
  }

  return { symbol, market };
}

export function resolveHoldingBySymbol(input: string, holdings: HoldingSummary[]): HoldingSummary {
  const selector = parseHoldingSelector(input);
  const symbol = normalize(selector.symbol);
  const market = selector.market ? normalize(selector.market) : undefined;

  const matches = holdings.filter((holding) => {
    if (normalize(holding.symbol) !== symbol) {
      return false;
    }
    return market ? normalize(holding.market) === market : true;
  });

  if (matches.length === 1) {
    return matches[0]!;
  }

  if (matches.length > 1) {
    throw new Error(
      `Holding symbol is ambiguous. Use a fully qualified symbol. Matching holdings: ${formatHoldings(matches)}.`,
    );
  }

  const available = holdings.length > 0 ? ` Available holdings: ${formatHoldings(holdings)}.` : "";
  throw new Error(`No holding found for '${input}'.${available}`);
}

export function extractHoldingsFromResponse(response: unknown): HoldingSummary[] {
  return extractHoldingRecordsFromResponse(response)
    .map((holding): HoldingSummary | undefined => {
      const record = asRecord(holding);
      const instrument = asRecord(record?.instrument);
      const id = asNumber(record?.id);
      const symbol = asString(record?.symbol) ?? asString(instrument?.code);
      const market = asString(record?.market) ?? asString(instrument?.market_code);
      if (typeof id !== "number" || !symbol || !market) {
        return undefined;
      }
      return {
        id,
        symbol,
        market,
        name: asString(record?.name) ?? asString(instrument?.name),
      };
    })
    .filter((holding): holding is HoldingSummary => Boolean(holding));
}

export function extractHoldingRecordsFromResponse(response: unknown): unknown[] {
  const root = asRecord(response);
  return asArray(root?.holdings);
}

function formatHoldings(holdings: HoldingSummary[]): string {
  return holdings
    .map((holding) => `${holding.symbol}.${holding.market}`)
    .sort((a, b) => a.localeCompare(b))
    .join(", ");
}

function normalize(input: string): string {
  return input.trim().toUpperCase();
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
  return typeof input === "string" && input.length > 0 ? input : undefined;
}

function asNumber(input: unknown): number | undefined {
  if (typeof input === "number" && Number.isFinite(input)) {
    return input;
  }
  if (typeof input === "string") {
    const match = input.match(/^\d+/);
    if (match) {
      const parsed = Number(match[0]);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
  }
  return undefined;
}
