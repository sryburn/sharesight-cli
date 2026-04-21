import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { getCredentialsFilePath } from "../config.js";
import type { Credentials } from "../types.js";

const SERVICE = "sharesight-cli";
const ACCOUNT = "default";

export interface CredentialStore {
  save(credentials: Credentials): Promise<void>;
  load(): Promise<Credentials | null>;
  clear(): Promise<void>;
}

export type CredentialBackend = "env" | "secure-store" | "local-file" | "none";

export interface CredentialStatus {
  backend: CredentialBackend;
  detail: string;
}

export class SystemCredentialStore implements CredentialStore {
  readonly backendName = "secure-store";

  async save(credentials: Credentials): Promise<void> {
    const payload = JSON.stringify(credentials);
    if (process.platform === "linux") {
      ensureCommandAvailable("secret-tool");
      const result = spawnSync(
        "secret-tool",
        ["store", "--label", "Sharesight CLI", "service", SERVICE, "account", ACCOUNT],
        { input: payload, encoding: "utf8" },
      );
      if (result.status !== 0) {
        throw commandError("secret-tool store", result.stderr);
      }
      return;
    }

    if (process.platform === "darwin") {
      ensureCommandAvailable("security");
      const result = spawnSync(
        "security",
        ["add-generic-password", "-U", "-a", ACCOUNT, "-s", SERVICE, "-w", payload],
        { encoding: "utf8" },
      );
      if (result.status !== 0) {
        throw commandError("security add-generic-password", result.stderr);
      }
      return;
    }

    if (process.platform === "win32") {
      throw new Error("Windows secure storage backend is not yet implemented.");
    }

    throw new Error("Unsupported platform for secure credential storage.");
  }

  async load(): Promise<Credentials | null> {
    if (process.platform === "linux") {
      if (!isCommandAvailable("secret-tool")) {
        return null;
      }
      const result = spawnSync(
        "secret-tool",
        ["lookup", "service", SERVICE, "account", ACCOUNT],
        { encoding: "utf8" },
      );
      if (result.status !== 0) {
        return null;
      }
      return parseCredentials(result.stdout.trim());
    }

    if (process.platform === "darwin") {
      if (!isCommandAvailable("security")) {
        return null;
      }
      const result = spawnSync(
        "security",
        ["find-generic-password", "-a", ACCOUNT, "-s", SERVICE, "-w"],
        { encoding: "utf8" },
      );
      if (result.status !== 0) {
        return null;
      }
      return parseCredentials(result.stdout.trim());
    }

    return null;
  }

  async clear(): Promise<void> {
    if (process.platform === "linux") {
      if (!isCommandAvailable("secret-tool")) {
        return;
      }
      const result = spawnSync(
        "secret-tool",
        ["clear", "service", SERVICE, "account", ACCOUNT],
        { encoding: "utf8" },
      );
      if (result.status !== 0) {
        throw commandError("secret-tool clear", result.stderr);
      }
      return;
    }

    if (process.platform === "darwin") {
      if (!isCommandAvailable("security")) {
        return;
      }
      const result = spawnSync(
        "security",
        ["delete-generic-password", "-a", ACCOUNT, "-s", SERVICE],
        { encoding: "utf8" },
      );
      if (result.status !== 0) {
        throw commandError("security delete-generic-password", result.stderr);
      }
    }
  }
}

class FileCredentialStore implements CredentialStore {
  readonly backendName = "local-file";

  constructor(private readonly filePath = getCredentialsFilePath()) {}

  async save(credentials: Credentials): Promise<void> {
    mkdirSync(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, `${JSON.stringify(credentials, null, 2)}\n`, {
      mode: 0o600,
    });
  }

  async load(): Promise<Credentials | null> {
    try {
      const raw = await fs.readFile(this.filePath, "utf8");
      return parseCredentials(raw);
    } catch (error) {
      if (isFileMissing(error)) {
        return null;
      }
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      await fs.unlink(this.filePath);
    } catch (error) {
      if (!isFileMissing(error)) {
        throw error;
      }
    }
  }
}

export class CredentialManager {
  constructor(
    private readonly secureStore: CredentialStore = new SystemCredentialStore(),
    private readonly fallbackStore: CredentialStore = new FileCredentialStore(),
  ) {}

  async savePreferSecure(credentials: Credentials): Promise<CredentialStatus> {
    try {
      await this.secureStore.save(credentials);
      await this.fallbackStore.clear();
      return {
        backend: "secure-store",
        detail: "Credentials stored in system secure storage.",
      };
    } catch (error) {
      await this.fallbackStore.save(credentials);
      const reason = error instanceof Error ? error.message : String(error);
      return {
        backend: "local-file",
        detail:
          `Secure storage unavailable (${reason}). Credentials stored in local fallback file at ${getCredentialsFilePath()} with mode 0600.`,
      };
    }
  }

  async load(): Promise<{ credentials: Credentials; backend: Exclude<CredentialBackend, "none"> }> {
    const envClientId = process.env.SHARESIGHT_CLIENT_ID;
    const envClientSecret = process.env.SHARESIGHT_CLIENT_SECRET;
    if (envClientId && envClientSecret) {
      return {
        credentials: { clientId: envClientId, clientSecret: envClientSecret },
        backend: "env",
      };
    }

    const secure = await this.secureStore.load();
    if (secure) {
      return { credentials: secure, backend: "secure-store" };
    }

    const fallback = await this.fallbackStore.load();
    if (fallback) {
      return { credentials: fallback, backend: "local-file" };
    }

    throw new Error(
      "No credentials found. Run `sharesight auth login` or set SHARESIGHT_CLIENT_ID and SHARESIGHT_CLIENT_SECRET.",
    );
  }

  async clearAll(): Promise<void> {
    await this.secureStore.clear();
    await this.fallbackStore.clear();
  }

  async status(): Promise<CredentialStatus> {
    const envClientId = process.env.SHARESIGHT_CLIENT_ID;
    const envClientSecret = process.env.SHARESIGHT_CLIENT_SECRET;
    if (envClientId && envClientSecret) {
      return {
        backend: "env",
        detail: "Credentials available via environment variables.",
      };
    }

    const secure = await this.secureStore.load();
    if (secure) {
      return {
        backend: "secure-store",
        detail: "Credentials are stored in system secure storage.",
      };
    }

    const fallback = await this.fallbackStore.load();
    if (fallback) {
      return {
        backend: "local-file",
        detail: `Credentials are stored in local fallback file at ${getCredentialsFilePath()}.`,
      };
    }

    return {
      backend: "none",
      detail: "No credentials configured.",
    };
  }
}

export async function loadCredentials(
  manager: CredentialManager = new CredentialManager(),
): Promise<Credentials> {
  const result = await manager.load();
  return result.credentials;
}

function parseCredentials(raw: string): Credentials {
  try {
    const parsed = JSON.parse(raw) as Credentials;
    if (!parsed.clientId || !parsed.clientSecret) {
      throw new Error();
    }
    return parsed;
  } catch {
    throw new Error("Stored credentials are invalid. Run `sharesight auth login` again.");
  }
}

function commandError(command: string, stderr: string): Error {
  const details = stderr.trim() ? `: ${stderr.trim()}` : "";
  return new Error(`Failed to execute ${command}${details}`);
}

function isCommandAvailable(command: string): boolean {
  const result = spawnSync("sh", ["-lc", `command -v ${escapeForShell(command)} >/dev/null 2>&1`], {
    encoding: "utf8",
  });
  return result.status === 0;
}

function ensureCommandAvailable(command: string): void {
  if (!isCommandAvailable(command)) {
    throw new Error(`Required secure storage command '${command}' is not available.`);
  }
}

function escapeForShell(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function isFileMissing(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}
