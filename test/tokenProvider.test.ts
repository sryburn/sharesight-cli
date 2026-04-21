import { afterEach, describe, expect, it, vi } from "vitest";
import { TokenProvider } from "../src/auth/tokenProvider.js";

describe("TokenProvider error mapping", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns a friendly message for DNS lookup failures", async () => {
    const provider = new TokenProvider("https://api.sharesight.com", 30000);

    const dnsCause = Object.assign(new Error("getaddrinfo EAI_AGAIN api.sharesight.com"), {
      code: "EAI_AGAIN",
      hostname: "api.sharesight.com",
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw Object.assign(new TypeError("fetch failed"), { cause: dnsCause });
      }),
    );

    await expect(
      provider.getAccessToken({ clientId: "id", clientSecret: "secret" }),
    ).rejects.toThrow("Could not resolve Sharesight API hostname");
  });

  it("returns a friendly message for timeout aggregate errors", async () => {
    const provider = new TokenProvider("https://api.sharesight.com", 30000);

    const aggregate = Object.assign(new AggregateError([], "connect timeout"), {
      code: "ETIMEDOUT",
      errors: [
        Object.assign(new Error("connect ETIMEDOUT api.sharesight.com:443"), {
          code: "ETIMEDOUT",
        }),
      ],
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw Object.assign(new TypeError("fetch failed"), { cause: aggregate });
      }),
    );

    await expect(
      provider.getAccessToken({ clientId: "id", clientSecret: "secret" }),
    ).rejects.toThrow("Network error while connecting to Sharesight API (ETIMEDOUT)");
  });
});
