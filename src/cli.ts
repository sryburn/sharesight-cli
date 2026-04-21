#!/usr/bin/env node
import { setDefaultResultOrder } from "node:dns";
import { Command } from "commander";
import { readRuntimeConfig } from "./config.js";
import { registerAuthCommands } from "./commands/auth.js";
import { registerPortfolioCommands } from "./commands/portfolio.js";
import { registerPerformanceCommand } from "./commands/performance.js";

async function main(): Promise<void> {
  try {
    setDefaultResultOrder("ipv4first");
  } catch {
    // Continue with platform defaults if this runtime does not support it.
  }

  const program = new Command()
    .name("sharesight")
    .description("CLI wrapper around Sharesight API")
    .version("0.1.0")
    .option("--base-url <url>", "Sharesight API base URL")
    .option("--timeout-ms <ms>", "Request timeout in milliseconds")
    .option("--verbose", "Enable verbose output", false);

  const getConfig = () =>
    readRuntimeConfig({
      baseUrl: program.opts().baseUrl as string | undefined,
      timeoutMs: program.opts().timeoutMs as string | undefined,
      verbose: program.opts().verbose as boolean | undefined,
    });

  registerAuthCommands(program, getConfig);
  registerPortfolioCommands(program, getConfig);
  registerPerformanceCommand(program, getConfig);

  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Error: ${message}\n`);
    process.exitCode = 1;
  }
}

void main();
