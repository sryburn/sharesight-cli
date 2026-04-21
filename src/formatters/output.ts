import type { OutputFormat } from "../types.js";

export function printOutput(data: unknown, format: OutputFormat): void {
  if (format === "json") {
    process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
    return;
  }

  if (format === "jsonl") {
    if (!Array.isArray(data)) {
      process.stdout.write(`${JSON.stringify(data)}\n`);
      return;
    }
    for (const item of data) {
      process.stdout.write(`${JSON.stringify(item)}\n`);
    }
    return;
  }
  throw new Error(`Unsupported format '${format}'. Use json or jsonl.`);
}
