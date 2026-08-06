/**
 * Shared world constants for the game pack.
 *
 * The world is modelled in METERS; rendering multiplies by `PX_PER_M` to get
 * screen pixels. Keeping the simulation in meters makes the spec exact
 * ("30 m field", "0.5 m figure", "~4 m/s run") and decouples it from canvas size.
 */

/** Pixels drawn per world meter. 28 → a 30 m field is 840 px (render scale; +40% over the original 20). */
export const PX_PER_M = 28;

/** The arena is a square field, FIELD_M meters on each side. */
export const FIELD_M = 30;

/** A figure (player) is this wide, in meters — sized to match the drawn musa sprite. */
export const FIGURE_M = 1.5;

/** Figure radius in meters (bounds clamping, proximity, and the body's hittable area). */
export const FIGURE_RADIUS_M = FIGURE_M / 2;

/** Player running speed, meters per second. 30 m field crossed in ~7.5 s. */
export const RUN_SPEED_MS = 4;

/** How close (meters, center-to-center) the player must be to interact with an NPC. */
export const NPC_INTERACT_M = 1.5;

// --- Combat / abilities (Arena) ---

/** Sword reach in meters (how far in front an attack hits) — matches the on-screen sword image. */
export const SWORD_REACH_M = 2;

/** Half-angle (radians) of the attack cone; 45° → a 90° forward arc. */
export const ATTACK_CONE_HALF_ANGLE = Math.PI / 4;

/**
 * 2.5D melee hit shape. The sim is flat top-down, but figures/creatures are drawn TALL from a foot
 * shadow with the depth axis foreshortened, so a target's hittable body is a vertical CAPSULE — a
 * footprint circle (its `hitRadius`) swept from the foot up to its drawn height — not a flat disc.
 * A swing connects if it reaches any point up that silhouette, so aiming at the head/torso lands.
 * `FIGURE_HIT_HEIGHT_M` is the player capsule height; enemies carry their own per-kind height.
 */
export const FIGURE_HIT_HEIGHT_M = 1.8;
/** Spacing (metres) between the sampled points along a body capsule when resolving a hit. */
export const MELEE_BODY_SAMPLE_M = 0.4;

/** Seconds the swing visual stays up (damage itself resolves on the initiation tick). */
export const ATTACK_TTL_S = 0.2;

/** Minimum delay between attacks (seconds). */
export const ATTACK_COOLDOWN_S = 1;

/** Seconds the defensive weapon pose can intercept an incoming hit. */
export const BLOCK_TTL_S = 0.2;

/** Seconds between block attempts, measured from the start of the block. */
export const BLOCK_COOLDOWN_S = 1;

/** Blocking covers an area 20% wider than the weapon's normal attack arc. */
export const BLOCK_WIDTH_MULT = 1.2;

/** Distance (meters) a victim is knocked back, away from the attacker, on a hit (reach + 1 m). */
export const KNOCKBACK_M = SWORD_REACH_M + 1;

/** Dash speed multiplier applied to run speed while dashing. */
export const DASH_MULT = 4;

/** Dash burst distance in meters. */
export const DASH_DIST_M = 2;

/** Dash cooldown in seconds, 15% faster than the original 3-second recharge. */
export const DASH_COOLDOWN_S = 2.55;

/** Radius (meters) of a ranged projectile, for its body-overlap hit test. */
export const PROJECTILE_RADIUS_M = 0.15;

// --- Match rules (Arena) ---

/** Hearts each player starts with. */
export const START_HEALTH = 3;

/** Max players per warm-up room / match. */
export const MAX_PLAYERS = 8;

/** Pre-match countdown length in seconds (3-2-1 tik-tok). */
export const COUNTDOWN_S = 3;

/** Authoritative simulation rate (Hz). */
export const TICK_HZ = 20;

/** Convert a world-meters value to screen pixels. */
export const toPx = (meters: number): number => meters * PX_PER_M;
