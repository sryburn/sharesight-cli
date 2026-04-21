import type { OutputFormat } from "../types.js";

export function parseOutputFormat(
  input: string | undefined,
  fallback: OutputFormat = "json",
): OutputFormat {
  if (input === undefined) {
    return fallback;
  }
  if (input === "json" || input === "jsonl") {
    return input;
  }
  throw new Error(`Unsupported format '${input}'. Use json or jsonl.`);
}
