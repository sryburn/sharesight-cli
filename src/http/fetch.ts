interface ErrorWithCode extends Error {
  code?: string;
  hostname?: string;
  cause?: unknown;
}

export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export function mapFetchError(
  error: unknown,
  context: {
    baseUrl: string;
    timeoutMs: number;
    hostname: string;
    purpose: string;
  },
): Error {
  const raw = error instanceof Error ? error : new Error(String(error));
  const rawWithCode = raw as ErrorWithCode;
  const cause = rawWithCode.cause as ErrorWithCode | undefined;
  const code = rawWithCode.code ?? cause?.code;

  if (raw.name === "AbortError") {
    return new Error(
      `${context.purpose} timed out after ${context.timeoutMs}ms. Try increasing --timeout-ms or check your network connection.`,
    );
  }

  if (code === "EAI_AGAIN" || code === "ENOTFOUND") {
    return new Error(
      `Could not resolve Sharesight API hostname. DNS lookup failed (${code}) for ${cause?.hostname ?? context.hostname}.`,
    );
  }

  if (code === "ETIMEDOUT" || code === "ECONNRESET" || code === "ECONNREFUSED") {
    return new Error(
      `Network error while connecting to Sharesight API (${code}). Check firewall/proxy/VPN settings for ${context.baseUrl}.`,
    );
  }

  if (code === "ENETUNREACH" || code === "EHOSTUNREACH") {
    return new Error(
      `Network route to Sharesight API is unavailable (${code}). Check local network routing or IPv6/IPv4 connectivity.`,
    );
  }

  const causeMessage = cause?.message ?? raw.message;
  return new Error(`Failed to reach Sharesight API: ${causeMessage}`);
}
