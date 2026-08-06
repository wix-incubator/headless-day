/**
 * Raw held-key state → serializable ShooterIntent (+ edge memory), and the
 * host-side trust boundary `coerceShooterIntent` (peers can only ever send
 * well-formed intent bits — never positions/health/enemies).
 */

import type { RawShooterInput, ShooterInputMemory, ShooterIntent } from "./types";

export function initialShooterMemory(): ShooterInputMemory {
  return { reloadHeld: false, pick1Held: false, pick2Held: false, pick3Held: false };
}

export function inputToShooterIntent(
  raw: RawShooterInput,
  mem: ShooterInputMemory,
): { intent: ShooterIntent; memory: ShooterInputMemory } {
  const picks: Array<0 | 1 | 2> = [];
  if (raw.pick1 && !mem.pick1Held) picks.push(0);
  if (raw.pick2 && !mem.pick2Held) picks.push(1);
  if (raw.pick3 && !mem.pick3Held) picks.push(2);
  return {
    intent: {
      move: { up: raw.up, down: raw.down, left: raw.left, right: raw.right },
      aim: raw.aim,
      fire: raw.fire,
      reload: raw.reload && !mem.reloadHeld,
      perkPick: picks[0] ?? null,
    },
    memory: { reloadHeld: raw.reload, pick1Held: raw.pick1, pick2Held: raw.pick2, pick3Held: raw.pick3 },
  };
}

/** Sanitize an untrusted wire intent (the host's anti-cheat boundary). */
export function coerceShooterIntent(raw: unknown): ShooterIntent {
  const i = (raw ?? {}) as Partial<ShooterIntent> & { move?: Partial<ShooterIntent["move"]> };
  const m: Partial<ShooterIntent["move"]> = i.move ?? {};
  const aim = Number.isFinite(i.aim) ? (i.aim as number) : undefined;
  const perkPick = i.perkPick === 0 || i.perkPick === 1 || i.perkPick === 2 ? i.perkPick : null;
  return {
    move: { up: !!m.up, down: !!m.down, left: !!m.left, right: !!m.right },
    aim,
    fire: !!i.fire,
    reload: !!i.reload,
    perkPick,
  };
}
