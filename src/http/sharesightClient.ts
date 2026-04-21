import type { RuntimeConfig } from "../config.js";
import { TokenProvider } from "../auth/tokenProvider.js";
import type { Credentials, Portfolio } from "../types.js";
import { fetchWithTimeout, mapFetchError } from "./fetch.js";

export class SharesightClient {
  private readonly tokenProvider: TokenProvider;

  constructor(private readonly config: RuntimeConfig, tokenProvider?: TokenProvider) {
    this.tokenProvider = tokenProvider ?? new TokenProvider(config.baseUrl, config.timeoutMs);
  }

  async listPortfolios(credentials: Credentials, consolidated: boolean): Promise<Portfolio[]> {
    const data = await this.getJson<unknown>(
      `/api/v3/portfolios?consolidated=${consolidated ? "true" : "false"}`,
      credentials,
    );
    return this.parsePortfolioListResponse(data);
  }

  async listAllPortfolios(credentials: Credentials): Promise<Portfolio[]> {
    const [standardPortfolios, consolidatedPortfolios] = await Promise.all([
      this.listPortfolios(credentials, false),
      this.listPortfolios(credentials, true),
    ]);
    return [...standardPortfolios, ...consolidatedPortfolios];
  }

  private parsePortfolioListResponse(data: unknown): Portfolio[] {
    if (Array.isArray(data)) {
      return data as Portfolio[];
    }
    if (data && typeof data === "object" && Array.isArray((data as Record<string, unknown>).portfolios)) {
      return (data as { portfolios: Portfolio[] }).portfolios;
    }
    throw new Error("Unexpected response when listing portfolios.");
  }

  async getPerformance(
    credentials: Credentials,
    portfolioId: number,
    query: Record<string, string | undefined>,
  ): Promise<unknown> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value) {
        params.set(key, value);
      }
    }
    const suffix = params.toString() ? `?${params.toString()}` : "";
    return this.getJson(`/api/v3/portfolios/${portfolioId}/performance${suffix}`, credentials);
  }

  private async getJson<T>(path: string, credentials: Credentials): Promise<T> {
    const token = await this.tokenProvider.getAccessToken(credentials);
    let response: Response;
    try {
      response = await fetchWithTimeout(
        `${this.config.baseUrl}${path}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        },
        this.config.timeoutMs,
      );
    } catch (error) {
      throw mapFetchError(error, {
        baseUrl: this.config.baseUrl,
        timeoutMs: this.config.timeoutMs,
        hostname: "api.sharesight.com",
        purpose: "Sharesight API request",
      });
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Sharesight API request failed (${response.status}): ${text}`);
    }

    return (await response.json()) as T;
  }
}
