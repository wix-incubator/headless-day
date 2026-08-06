import { GROUP_TOKEN, groupForToken } from "./categoryChips";
import type { FilterState, FilterStateMap, TrendGroup } from "../types/trends";

const FILTER_SEPARATOR = ",";

export function cycleState(current: FilterState = "neutral"): FilterState {
  if (current === "neutral") return "on";
  if (current === "on") return "off";
  return "neutral";
}

export function getState(map: FilterStateMap, key: string): FilterState {
  return map[key] ?? "neutral";
}

function partition(map: FilterStateMap) {
  const on: string[] = [];
  const off: string[] = [];

  for (const [key, state] of Object.entries(map)) {
    if (state === "on") on.push(key);
    else if (state === "off") off.push(key);
  }

  return { on, off };
}

export function facetMatches(map: FilterStateMap, values: string[]): boolean {
  const { on, off } = partition(map);
  if (off.some((value) => values.includes(value))) return false;
  if (on.length === 0) return true;
  return on.some((value) => values.includes(value));
}

export function isAllNeutral(map: FilterStateMap): boolean {
  return Object.values(map).every((state) => state === "neutral");
}

export function serializeGroupFilters(groupStates: FilterStateMap): URLSearchParams {
  const params = new URLSearchParams();
  const on: string[] = [];
  const off: string[] = [];

  for (const [group, state] of Object.entries(groupStates)) {
    const token = GROUP_TOKEN[group as TrendGroup];
    if (!token) continue;
    if (state === "on") on.push(token);
    else if (state === "off") off.push(token);
  }

  if (on.length) params.set("on", on.join(FILTER_SEPARATOR));
  if (off.length) params.set("off", off.join(FILTER_SEPARATOR));
  return params;
}

function parseTokenList(params: URLSearchParams, key: string): TrendGroup[] {
  const raw = params.get(key);
  if (!raw) return [];

  return raw
    .split(FILTER_SEPARATOR)
    .map((token) => groupForToken(token.trim()))
    .filter((group): group is TrendGroup => Boolean(group));
}

export function parseGroupFilters(search: string): FilterStateMap {
  const params = new URLSearchParams(search);
  const map: FilterStateMap = {};

  for (const group of parseTokenList(params, "on")) map[group] = "on";
  for (const group of parseTokenList(params, "off")) map[group] = "off";
  return map;
}
