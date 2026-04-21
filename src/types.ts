export type OutputFormat = "json" | "jsonl";

export interface Credentials {
  clientId: string;
  clientSecret: string;
}

export interface Portfolio {
  id: number;
  name: string;
  [key: string]: unknown;
}

export interface CliContextState {
  defaultPortfolioId?: number;
  defaultPortfolioName?: string;
}
