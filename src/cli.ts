#!/usr/bin/env node
import { setDefaultResultOrder } from "node:dns";
import { Command } from "commander";
import { readRuntimeConfig } from "./config.js";
import { registerAuthCommands } from "./commands/auth.js";
import { registerDefaultsCommands } from "./commands/defaults.js";
import { registerGetCommands } from "./commands/get.js";
import { registerListCommands } from "./commands/list.js";

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
    .addHelpText(
      "after",
      `
Command reference:
  auth
    sharesight auth login [--client-id <id>] [--client-secret <secret>]
    sharesight auth status
    sharesight auth logout

  defaults
    sharesight defaults show [--format json|jsonl]
    sharesight defaults set [--portfolio <id-or-name>] [--grouping <grouping-or-custom-name-or-id>]

  list
    sharesight list portfolios [--format json|jsonl]
    sharesight list groupings [--format json|jsonl]

  get
    sharesight get performance [--portfolio <id-or-name>] [--start-date YYYY-MM-DD] [--end-date YYYY-MM-DD]
      [--include-sales] [--grouping <grouping-or-custom-name-or-id>]
      [--format json|jsonl]

Details:
  sharesight <command> --help
`,
    );

  const getConfig = () =>
    readRuntimeConfig({
      baseUrl: program.opts().baseUrl as string | undefined,
      timeoutMs: program.opts().timeoutMs as string | undefined,
    });

  registerAuthCommands(program, getConfig);
  registerDefaultsCommands(program, getConfig);
  registerListCommands(program, getConfig);
  registerGetCommands(program, getConfig);

  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Error: ${message}\n`);
    process.exitCode = 1;
  }
}

void main();
