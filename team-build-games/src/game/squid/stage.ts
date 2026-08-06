/** Data-only stage definitions. Ground is y=0 everywhere except inside a hole (no support). */

export type StageId = "stage1" | "stage2";

export interface StageDef {
  id: StageId;
  name: string;
  /** Horizontal span with no ground support, or null for a solid course. */
  hole: { x: number; width: number } | null;
}

export const STAGES: StageDef[] = [
  { id: "stage1", name: "Boardwalk", hole: null },
  { id: "stage2", name: "The Gap", hole: { x: 3, width: 0.9 } },
];

export function stageById(id: StageId): StageDef {
  return STAGES.find((s) => s.id === id) ?? STAGES[0]!;
}

/** Ground height at x, or null where there is no support (inside the hole). */
export function groundYAt(x: number, stage: StageDef): number | null {
  const h = stage.hole;
  if (h && x >= h.x && x <= h.x + h.width) return null;
  return 0;
}

/** Wire/UI trust boundary: narrow an untrusted value to a known stage id. */
export function coerceStageId(raw: unknown): StageId {
  return STAGES.some((s) => s.id === raw) ? (raw as StageId) : "stage1";
}

/** The stage after `id` in STAGES order, or null when `id` is the last stage. */
export function nextStageId(id: StageId): StageId | null {
  const i = STAGES.findIndex((s) => s.id === id);
  return i >= 0 && i + 1 < STAGES.length ? STAGES[i + 1]!.id : null;
}
