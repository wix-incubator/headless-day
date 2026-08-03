/**
 * Pure team model for the Team Versus mode (players pick teams in the warm-up room, then clash).
 * Deterministic — assignment + win detection are order-independent (no clock/RNG), so every peer
 * agrees. This is the sim-side model; the lobby UI drives `assignPlayer`, and the match uses
 * `teamWinner`/`isTeamMatchOver` for its end condition (the team analogue of versus' sole-survivor).
 */

import type { PlayerId } from "./types";

export type TeamId = number; // 0-based team index

export interface TeamInfo {
  id: TeamId;
  name: string;
  color: number;
}

/** Team Versus ships with two teams; the model itself supports any `numTeams`. */
export const TEAMS: TeamInfo[] = [
  { id: 0, name: "Red", color: 0xef4444 },
  { id: 1, name: "Blue", color: 0x3b82f6 },
];

export type TeamAssignment = Record<PlayerId, TeamId>;

const clampTeam = (team: number, numTeams: number): TeamId =>
  Math.max(0, Math.min(numTeams - 1, Math.floor(team)));

/** Evenly distribute players across teams, deterministically (sorted round-robin). */
export function autoBalance(playerIds: PlayerId[], numTeams = 2): TeamAssignment {
  const out: TeamAssignment = {};
  [...playerIds].sort().forEach((id, i) => {
    out[id] = i % numTeams;
  });
  return out;
}

/** Manually move a player to a team (clamped to a valid team). Returns a new assignment. */
export function assignPlayer(assignment: TeamAssignment, playerId: PlayerId, team: TeamId, numTeams = 2): TeamAssignment {
  return { ...assignment, [playerId]: clampTeam(team, numTeams) };
}

/** Head-count per team index (0..numTeams-1). */
export function teamSizes(assignment: TeamAssignment, numTeams = 2): number[] {
  const sizes = Array<number>(numTeams).fill(0);
  for (const team of Object.values(assignment)) {
    if (team >= 0 && team < numTeams) sizes[team]!++;
  }
  return sizes;
}

/** True when the largest and smallest teams differ by at most one player. */
export function isBalanced(assignment: TeamAssignment, numTeams = 2): boolean {
  const sizes = teamSizes(assignment, numTeams);
  return Math.max(...sizes) - Math.min(...sizes) <= 1;
}

export function teamOf(assignment: TeamAssignment, playerId: PlayerId): TeamId | null {
  return playerId in assignment ? assignment[playerId]! : null;
}

/** Teams with at least one alive player. */
function survivingTeams(assignment: TeamAssignment, alive: PlayerId[]): Set<TeamId> {
  const teams = new Set<TeamId>();
  for (const id of alive) {
    const team = assignment[id];
    if (team !== undefined) teams.add(team);
  }
  return teams;
}

/** The sole surviving team (all others fully eliminated), or null (still contested, or mutual wipe). */
export function teamWinner(assignment: TeamAssignment, alive: PlayerId[]): TeamId | null {
  const teams = survivingTeams(assignment, alive);
  return teams.size === 1 ? [...teams][0]! : null;
}

/** The match is over once ≤1 team has any alive players (1 → that team won; 0 → draw). */
export function isTeamMatchOver(assignment: TeamAssignment, alive: PlayerId[]): boolean {
  return survivingTeams(assignment, alive).size <= 1;
}
