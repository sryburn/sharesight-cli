import os from "node:os";
import path from "node:path";

export const DEFAULT_BASE_URL = "https://api.sharesight.com";
export const APP_NAME = "sharesight-cli";

export interface RuntimeConfig {
  baseUrl: string;
  timeoutMs: number;
}

export function readRuntimeConfig(options: {
  baseUrl?: string;
  timeoutMs?: string;
}): RuntimeConfig {
  const timeoutMs = options.timeoutMs ? Number(options.timeoutMs) : 30000;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error("timeout must be a positive number");
  }

  return {
    baseUrl: options.baseUrl ?? DEFAULT_BASE_URL,
    timeoutMs,
  };
}

export function getConfigDir(): string {
  const xdg = process.env.XDG_CONFIG_HOME;
  if (xdg && xdg.trim().length > 0) {
    return path.join(xdg, APP_NAME);
  }
  return path.join(os.homedir(), ".config", APP_NAME);
}

export function getStateFilePath(): string {
  return path.join(getConfigDir(), "state.json");
}

export function getCredentialsFilePath(): string {
  return path.join(getConfigDir(), "credentials.json");
}
