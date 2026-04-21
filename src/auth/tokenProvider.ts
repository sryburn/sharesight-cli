import type { Credentials } from "../types.js";
import { fetchWithTimeout, mapFetchError } from "../http/fetch.js";

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

export class TokenProvider {
  private cachedToken?: { token: string; expiresAtMs: number };

  constructor(
    private readonly baseUrl: string,
    private readonly timeoutMs: number,
  ) {}

  async getAccessToken(credentials: Credentials): Promise<string> {
    if (this.cachedToken && this.cachedToken.expiresAtMs > Date.now() + 5000) {
      return this.cachedToken.token;
    }

    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
    });

    let response: Response;
    try {
      response = await fetchWithTimeout(
        `${this.baseUrl}/oauth2/token`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body,
        },
        this.timeoutMs,
      );
    } catch (error) {
      throw mapFetchError(error, {
        baseUrl: this.baseUrl,
        timeoutMs: this.timeoutMs,
        hostname: "api.sharesight.com",
        purpose: "Request to Sharesight token endpoint",
      });
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to retrieve access token (${response.status}): ${text}`);
    }

    const payload = (await response.json()) as TokenResponse;
    this.cachedToken = {
      token: payload.access_token,
      expiresAtMs: Date.now() + payload.expires_in * 1000,
    };
    return payload.access_token;
  }
}
