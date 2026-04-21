import type { PerformanceGrouping } from "./types.js";

export const VALID_PERFORMANCE_GROUPINGS: PerformanceGrouping[] = [
  "country",
  "currency",
  "industry_classification",
  "investment_type",
  "market",
  "portfolio",
  "sector_classification",
  "ungrouped",
];

export interface CustomGroup {
  id: number;
  name: string;
}

export async function resolveGroupingSelection(params: {
  explicitGrouping?: string;
  defaultGrouping?: PerformanceGrouping;
  defaultCustomGroupId?: number;
  loadCustomGroups?: () => Promise<CustomGroup[]>;
}): Promise<{ grouping?: PerformanceGrouping; customGroupId?: number }> {
  if (!params.explicitGrouping) {
    return resolveDefaultGrouping(params.defaultGrouping, params.defaultCustomGroupId);
  }

  const input = params.explicitGrouping.trim();
  if (isStandardGrouping(input)) {
    return { grouping: input };
  }

  const numeric = Number(input);
  if (Number.isInteger(numeric) && numeric > 0) {
    return { grouping: "custom_group", customGroupId: numeric };
  }

  if (!params.loadCustomGroups) {
    throw new Error("Cannot resolve custom group names without a groups loader.");
  }

  const customGroups = await params.loadCustomGroups();
  const exactNameMatches = customGroups.filter((group) => group.name === input);
  if (exactNameMatches.length === 1) {
    return { grouping: "custom_group", customGroupId: exactNameMatches[0]!.id };
  }
  if (exactNameMatches.length > 1) {
    const matchingIds = exactNameMatches.map((group) => group.id).join(", ");
    throw new Error(`Custom group name is ambiguous. Matching IDs: ${matchingIds}`);
  }

  const customGroupHint = formatCustomGroupHint(customGroups);
  throw new Error(
    `Invalid grouping '${input}'. Use one of: ${VALID_PERFORMANCE_GROUPINGS.join(", ")}, or a custom group name/id.${customGroupHint}`,
  );
}

export function extractCustomGroupsFromV2GroupsResponse(data: unknown): CustomGroup[] {
  const customGroups = findCustomGroupArray(data);
  if (!customGroups) {
    return [];
  }

  return customGroups
    .map((group): CustomGroup | undefined => {
      if (!group || typeof group !== "object") {
        return undefined;
      }
      const groupRecord = group as Record<string, unknown>;
      const idValue = groupRecord.id;
      const name = groupRecord.name;
      const id = typeof idValue === "number" ? idValue : Number.NaN;
      if (!Number.isInteger(id) || typeof name !== "string" || name.length === 0) {
        return undefined;
      }
      return { id, name };
    })
    .filter((group): group is CustomGroup => Boolean(group));
}

function findCustomGroupArray(data: unknown): unknown[] | undefined {
  if (!data || typeof data !== "object") {
    return undefined;
  }
  const record = data as Record<string, unknown>;
  const direct = record.custom_groups;
  if (Array.isArray(direct)) {
    return direct;
  }

  const nestedGroups = record.groups;
  if (Array.isArray(nestedGroups)) {
    return nestedGroups;
  }

  const customGroupsCamel = record.customGroups;
  if (Array.isArray(customGroupsCamel)) {
    return customGroupsCamel;
  }

  return undefined;
}

function isStandardGrouping(input: string): input is Exclude<PerformanceGrouping, "custom_group"> {
  return (
    input !== "custom_group" &&
    VALID_PERFORMANCE_GROUPINGS.includes(input as PerformanceGrouping)
  );
}

function resolveDefaultGrouping(
  defaultGrouping?: PerformanceGrouping,
  defaultCustomGroupId?: number,
): { grouping?: PerformanceGrouping; customGroupId?: number } {
  if (!defaultGrouping) {
    return {};
  }
  if (defaultGrouping !== "custom_group") {
    return { grouping: defaultGrouping };
  }
  if (!defaultCustomGroupId) {
    throw new Error(
      "Saved default grouping is custom_group but custom group id is missing. Run `sharesight defaults set --grouping <name-or-id>`.",
    );
  }
  return { grouping: "custom_group", customGroupId: defaultCustomGroupId };
}

function formatCustomGroupHint(customGroups: CustomGroup[]): string {
  if (customGroups.length === 0) {
    return " No custom groups were found.";
  }
  const formatted = customGroups.map((group) => `${group.name} (${group.id})`).join(", ");
  return ` Available custom groups: ${formatted}.`;
}
