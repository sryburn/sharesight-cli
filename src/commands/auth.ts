import type { Command } from "commander";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { CredentialManager } from "../auth/credentialStore.js";
import { TokenProvider } from "../auth/tokenProvider.js";
import type { RuntimeConfig } from "../config.js";

export function registerAuthCommands(
  program: Command,
  getConfig: () => RuntimeConfig,
): void {
  const auth = program.command("auth").description("Manage Sharesight authentication");
  const manager = new CredentialManager();

  auth
    .command("login")
    .description("Store client credentials securely and validate them")
    .option("--client-id <id>", "Sharesight OAuth client ID")
    .option("--client-secret <secret>", "Sharesight OAuth client secret")
    .action(async (options) => {
      const config = getConfig();
      const clientId = options.clientId ?? (await prompt("Client ID: "));
      const clientSecret = options.clientSecret ?? (await prompt("Client Secret: "));
      if (!clientId || !clientSecret) {
        throw new Error("Both client ID and client secret are required.");
      }

      const provider = new TokenProvider(config.baseUrl, config.timeoutMs);
      try {
        await provider.getAccessToken({ clientId, clientSecret });
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to validate credentials with Sharesight: ${reason}`);
      }

      const saveStatus = await manager.savePreferSecure({ clientId, clientSecret });
      if (saveStatus.backend === "secure-store") {
        process.stdout.write(`${saveStatus.detail}\n`);
      } else {
        process.stdout.write(`Warning: ${saveStatus.detail}\n`);
      }
    });

  auth
    .command("status")
    .description("Show whether credentials are configured")
    .action(async () => {
      const status = await manager.status();
      process.stdout.write(`${status.detail}\n`);
      if (status.backend === "none") {
        process.exitCode = 1;
        return;
      }
    });

  auth
    .command("logout")
    .description("Remove locally stored credentials")
    .action(async () => {
      await manager.clearAll();
      process.stdout.write("Stored credentials removed from local backends.\n");
    });

}

async function prompt(label: string): Promise<string> {
  const rl = readline.createInterface({ input, output });
  try {
    const answer = await rl.question(label);
    return answer.trim();
  } finally {
    rl.close();
  }
}
