import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ContextStore } from "../src/state/contextStore.js";

describe("ContextStore", () => {
  it("writes and reads state", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "sharesight-cli-test-"));
    const file = path.join(dir, "state.json");
    const store = new ContextStore(file);

    await store.write({
      defaultPortfolioId: 123,
      defaultPortfolioName: "Main",
      defaultPortfolioConsolidated: true,
      defaultGrouping: "custom_group",
      defaultCustomGroupId: 456,
    });
    const state = await store.read();
    expect(state.defaultPortfolioId).toBe(123);
    expect(state.defaultPortfolioName).toBe("Main");
    expect(state.defaultPortfolioConsolidated).toBe(true);
    expect(state.defaultGrouping).toBe("custom_group");
    expect(state.defaultCustomGroupId).toBe(456);
  });
});
