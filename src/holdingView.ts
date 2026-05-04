import { extractHoldingRecordsFromResponse } from "./holdingResolver.js";
import { lookupCountryCodeById } from "./countryReference.js";
import type { Portfolio } from "./types.js";

export function renderHoldingListView(params: { portfolio: Portfolio; response: unknown }): unknown {
  const holdings = extractHoldingRecordsFromResponse(params.response);
  return {
    portfolio: {
      id: params.portfolio.id,
      name: params.portfolio.name,
      consolidated: params.portfolio.consolidated,
    },
    meta: {
      count: holdings.length,
    },
    holdings: holdings
      .map((holding) => asRecord(holding))
      .filter((holding): holding is Record<string, unknown> => Boolean(holding))
      .map(formatHoldingRow),
  };
}

function formatHoldingRow(holding: Record<string, unknown>): unknown {
  const instrument = asRecord(holding.instrument);
  const instrumentCurrency = asRecord(holding.instrument_currency);
  const rest = flattenRecord(holding);
  delete rest.id;
  delete rest.symbol;
  delete rest.market;
  delete rest.name;
  const output = pruneUndefined({
    id: asNumber(holding.id) ?? holding.id,
    symbol: asString(holding.symbol) ?? asString(instrument?.code),
    market: asString(holding.market) ?? asString(holding.market_code) ?? asString(instrument?.market_code),
    name: asString(holding.name) ?? asString(instrument?.name),
    ...rest,
    labels: extractLabelNames(holding.labels),
    labelIds: extractLabelIds(holding.labels),
    labelDetails: extractLabelDetails(holding.labels),
    instrumentCountryCode:
      asString(instrument?.country_code) ??
      asString(asRecord(instrument?.country)?.code) ??
      lookupCountryCodeById(instrument?.country_id),
    currencyCode: asString(holding.currency_code) ?? asString(instrumentCurrency?.code),
    currencySymbol: asString(holding.currency_symbol) ?? asString(instrumentCurrency?.symbol),
    currencyQualifiedSymbol:
      asString(holding.currency_qualified_symbol) ?? asString(instrumentCurrency?.qualified_symbol),
  });

  removeIfDuplicate(output, "marketCode", "market");
  removeIfDuplicate(output, "instrumentCode", "symbol");
  removeIfDuplicate(output, "instrumentMarketCode", "market");
  removeIfDuplicate(output, "instrumentName", "name");
  delete output.instrumentFriendlyInstrumentDescriptionCode;
  delete output.instrumentCountryId;
  delete output.instrumentSupportedDenominations;
  delete output.instrumentCrypto;
  delete output.instrumentCurrencyCode;
  delete output.currencyId;
  delete output.expiresOn;
  delete output.expired;
  delete output.instrumentExpiresOn;
  delete output.instrumentExpired;
  delete output.tzName;
  delete output.instrumentTzName;

  return groupHoldingFields(output);
}

function groupHoldingFields(input: Record<string, unknown>): Record<string, unknown> {
  const identity = pickFields(input, ["id", "symbol", "market", "name"]);
  const other: Record<string, unknown> = {};
  const instrument: Record<string, unknown> = {};
  const currency: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input)) {
    if (key in identity) {
      continue;
    }
    if (key.startsWith("instrument")) {
      instrument[key] = value;
      continue;
    }
    if (key.startsWith("currency")) {
      currency[key] = value;
      continue;
    }
    other[key] = value;
  }

  return {
    ...identity,
    ...other,
    ...renameInstrumentFields(instrument),
    ...currency,
  };
}

function renameInstrumentFields(input: Record<string, unknown>): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    output[renameInstrumentField(key)] = value;
  }
  return output;
}

function renameInstrumentField(key: string): string {
  if (key === "instrumentId") {
    return key;
  }
  if (!key.startsWith("instrument")) {
    return key;
  }

  const withoutPrefix = key.slice("instrument".length);
  return `${withoutPrefix[0]?.toLowerCase()}${withoutPrefix.slice(1)}`;
}

function pickFields(input: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  for (const key of keys) {
    if (key in input) {
      output[key] = input[key];
    }
  }
  return output;
}

function flattenRecord(input: Record<string, unknown>, prefix = ""): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (key === "labels" || isPortfolioField(key, prefix)) {
      continue;
    }

    const outputKey = buildOutputKey(prefix, key);
    if (isScalar(value)) {
      setIfAbsent(output, outputKey, value);
      continue;
    }

    if (Array.isArray(value)) {
      const flattenedArray = flattenArray(value);
      if (flattenedArray !== undefined) {
        setIfAbsent(output, outputKey, flattenedArray);
      }
      continue;
    }

    const record = asRecord(value);
    if (record) {
      Object.assign(output, flattenRecord(record, outputKey));
    }
  }
  return output;
}

function isPortfolioField(key: string, prefix: string): boolean {
  if (prefix === "" && (key === "portfolio" || key === "portfolio_id" || key === "portfolio_name")) {
    return true;
  }
  return prefix === "portfolio";
}

function flattenArray(input: unknown[]): unknown[] | undefined {
  if (input.every(isScalar)) {
    return input;
  }

  const flattened = input
    .map((item): unknown => {
      if (isScalar(item)) {
        return item;
      }
      const record = asRecord(item);
      return record ? flattenRecord(record) : undefined;
    })
    .filter((item) => item !== undefined);

  return flattened.length > 0 ? flattened : undefined;
}

function extractLabelIds(input: unknown): Array<number | string> | undefined {
  const labelIds = asArray(input)
    .map((label): number | string | undefined => {
      const record = asRecord(label);
      const id = record?.id;
      return typeof id === "number" || typeof id === "string" ? id : undefined;
    })
    .filter((value): value is number | string => value !== undefined);

  return labelIds.length > 0 ? labelIds : undefined;
}

function extractLabelDetails(input: unknown): unknown[] | undefined {
  const labelDetails = asArray(input)
    .map((label): unknown => {
      const record = asRecord(label);
      return record ? flattenRecord(record) : undefined;
    })
    .filter((label) => label !== undefined);

  return labelDetails.length > 0 ? labelDetails : undefined;
}

function buildOutputKey(prefix: string, key: string): string {
  const camelKey = toCamelCase(key);
  if (!prefix) {
    if (key === "instrument_currency") {
      return "currency";
    }
    return camelKey;
  }
  return `${prefix}${capitalize(camelKey)}`;
}

function setIfAbsent(output: Record<string, unknown>, key: string, value: unknown): void {
  if (!(key in output)) {
    output[key] = value;
  }
}

function removeIfDuplicate(output: Record<string, unknown>, duplicateKey: string, canonicalKey: string): void {
  if (output[duplicateKey] === output[canonicalKey]) {
    delete output[duplicateKey];
  }
}

function isScalar(input: unknown): boolean {
  return (
    input === null ||
    typeof input === "string" ||
    typeof input === "number" ||
    typeof input === "boolean"
  );
}

function pruneUndefined(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

function extractLabelNames(input: unknown): string[] | undefined {
  const labels = asArray(input)
    .map((label): string | undefined => {
      if (typeof label === "string") {
        return label;
      }
      const record = asRecord(label);
      if (record && typeof record.name === "string" && record.name.length > 0) {
        return record.name;
      }
      return undefined;
    })
    .filter((value): value is string => Boolean(value));

  return labels.length > 0 ? labels : undefined;
}

function toCamelCase(input: string): string {
  return input.replace(/_([a-z])/g, (_, character: string) => character.toUpperCase());
}

function capitalize(input: string): string {
  return input ? `${input[0]?.toUpperCase()}${input.slice(1)}` : input;
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
