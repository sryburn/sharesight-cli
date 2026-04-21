import fs from "node:fs/promises";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { getStateFilePath } from "../config.js";
import type { CliContextState } from "../types.js";

const stateSchema = z.object({
  defaultPortfolioId: z.number().int().positive().optional(),
  defaultPortfolioName: z.string().min(1).optional(),
});

export class ContextStore {
  private readonly filePath: string;

  constructor(filePath = getStateFilePath()) {
    this.filePath = filePath;
  }

  async read(): Promise<CliContextState> {
    try {
      const raw = await fs.readFile(this.filePath, "utf8");
      return stateSchema.parse(JSON.parse(raw));
    } catch (error) {
      if (isFileMissing(error)) {
        return {};
      }
      throw error;
    }
  }

  async write(state: CliContextState): Promise<void> {
    mkdirSync(path.dirname(this.filePath), { recursive: true });
    const parsed = stateSchema.parse(state);
    await fs.writeFile(this.filePath, `${JSON.stringify(parsed, null, 2)}\n`, {
      mode: 0o600,
    });
  }
}

function isFileMissing(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}
