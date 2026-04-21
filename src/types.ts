export type OutputFormat = "json" | "jsonl";
export type PerformanceGrouping =
  | "country"
  | "currency"
  | "custom_group"
  | "industry_classification"
  | "investment_type"
  | "market"
  | "portfolio"
  | "sector_classification"
  | "ungrouped";

export interface Credentials {
  clientId: string;
  clientSecret: string;
}

export interface Portfolio {
  id: number;
  name: string;
  consolidated: boolean;
  [key: string]: unknown;
}

export interface CliContextState {
  defaultPortfolioId?: number;
  defaultPortfolioName?: string;
  defaultPortfolioConsolidated?: boolean;
  defaultPortfolioAccessLevel?: string;
  defaultGrouping?: PerformanceGrouping;
  defaultCustomGroupId?: number;
  defaultIncludeSales?: boolean;
  defaultFormat?: OutputFormat;
}
