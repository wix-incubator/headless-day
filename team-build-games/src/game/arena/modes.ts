/**
 * Arena game modes — the single choice a host makes in the warm-up room. Each mode maps onto the
 * two underlying sim axes: `rules` (how you win) and `arena` (the field type). Keeping them as one
 * named list is the player-facing model; the sim reads `rules`/`arena` off the chosen mode.
 *
 *   Free For All   — last one standing, open field                (live)
 *   Labyrinth      — last one standing, randomized maze (P9)       (wiring in progress)
 *   Coop Survival  — allies vs escalating creature waves (PvE)     (in development)
 *   Team Versus    — pick teams in the waiting room, then clash    (future)
 */

export type GameMode = "ffa" | "labyrinth" | "coop-survival" | "team-versus";

/** How a match is won/lost. */
export type MatchRules = "versus" | "survival" | "team";
/** The field layout. */
export type ArenaType = "open" | "labyrinth";

export interface ModeInfo {
  id: GameMode;
  name: string;
  blurb: string;
  rules: MatchRules;
  arena: ArenaType;
  /** Whether a host can pick it and start today. Non-available modes show as "soon" in the lobby. */
  available: boolean;
}

export const MODES: ModeInfo[] = [
  { id: "ffa", name: "Free For All", blurb: "Last one standing on the open field.", rules: "versus", arena: "open", available: true },
  { id: "labyrinth", name: "Labyrinth", blurb: "Last one standing in a randomized maze.", rules: "versus", arena: "labyrinth", available: false },
  { id: "coop-survival", name: "Coop Survival", blurb: "Team up against escalating creature waves.", rules: "survival", arena: "open", available: true },
  { id: "team-versus", name: "Team Versus", blurb: "Pick teams in the waiting room, then clash.", rules: "team", arena: "open", available: false },
];

export const DEFAULT_MODE: GameMode = "ffa";

const BY_ID: Record<GameMode, ModeInfo> = Object.fromEntries(MODES.map((m) => [m.id, m])) as Record<GameMode, ModeInfo>;

export function modeInfo(id: GameMode): ModeInfo {
  return BY_ID[id] ?? BY_ID[DEFAULT_MODE];
}

/** Narrow an untrusted value to a known mode id (wire/UI boundary). */
export function coerceMode(raw: unknown): GameMode {
  return typeof raw === "string" && raw in BY_ID ? (raw as GameMode) : DEFAULT_MODE;
}
