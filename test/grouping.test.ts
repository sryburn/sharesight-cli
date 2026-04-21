import { describe, expect, it } from "vitest";
import { extractCustomGroupsFromV2GroupsResponse, resolveGroupingSelection } from "../src/grouping.js";

describe("resolveGroupingSelection", () => {
  it("uses explicit standard grouping", async () => {
    await expect(
      resolveGroupingSelection({
        explicitGrouping: "market",
      }),
    ).resolves.toEqual({ grouping: "market", customGroupId: undefined });
  });

  it("uses explicit custom group id", async () => {
    await expect(
      resolveGroupingSelection({
        explicitGrouping: "10",
      }),
    ).resolves.toEqual({ grouping: "custom_group", customGroupId: 10 });
  });

  it("resolves explicit custom group name from group list", async () => {
    await expect(
      resolveGroupingSelection({
        explicitGrouping: "Income",
        loadCustomGroups: async () => [
          { id: 1, name: "Long Term" },
          { id: 2, name: "Income" },
        ],
      }),
    ).resolves.toEqual({ grouping: "custom_group", customGroupId: 2 });
  });

  it("uses defaults when explicit value is not set", async () => {
    await expect(
      resolveGroupingSelection({
        defaultGrouping: "custom_group",
        defaultCustomGroupId: 42,
      }),
    ).resolves.toEqual({ grouping: "custom_group", customGroupId: 42 });
  });

  it("treats explicit custom_group like a custom group name", async () => {
    await expect(
      resolveGroupingSelection({
        explicitGrouping: "custom_group",
        loadCustomGroups: async () => [{ id: 1, name: "Long Term" }],
      }),
    ).rejects.toThrow("Invalid grouping");
  });

  it("throws when explicit custom group name is unknown", async () => {
    await expect(
      resolveGroupingSelection({
        explicitGrouping: "Unknown Group",
        loadCustomGroups: async () => [{ id: 1, name: "Long Term" }],
      }),
    ).rejects.toThrow("Available custom groups: Long Term (1)");
  });
});

describe("extractCustomGroupsFromV2GroupsResponse", () => {
  it("extracts custom groups from custom_groups field", () => {
    expect(
      extractCustomGroupsFromV2GroupsResponse({
        custom_groups: [
          { id: 1, name: "Long Term" },
          { id: 2, name: "Income" },
        ],
      }),
    ).toEqual([
      { id: 1, name: "Long Term" },
      { id: 2, name: "Income" },
    ]);
  });

  it("returns empty list when shape is unknown", () => {
    expect(extractCustomGroupsFromV2GroupsResponse({})).toEqual([]);
  });
});
