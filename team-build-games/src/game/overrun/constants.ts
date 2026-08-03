/**
 * Overrun tuning constants. The sim is fixed-step (SHOOTER_TICK_HZ) so cadence,
 * cooldowns, and snapshots are exactly reproducible across host migrations.
 */

/** Fixed simulation rate (Hz) — the session accumulates render dt into whole ticks. */
export const SHOOTER_TICK_HZ = 30;
export const SHOOTER_DT = 1 / SHOOTER_TICK_HZ;
/** Broadcast a snapshot every N ticks (30/3 = 10 Hz). */
export const SNAPSHOT_EVERY_TICKS = 3;
/** Every Nth broadcast is a full keyframe (10 × 0.1 s ≈ 1 s). */
export const KEYFRAME_EVERY = 10;
export const SNAPSHOT_INTERVAL_S = SNAPSHOT_EVERY_TICKS / SHOOTER_TICK_HZ;
/** Cap on catch-up sim ticks per render frame (tab-refocus etc.). */
export const MAX_CATCHUP_TICKS = 4;
/** Overrun's own pre-match countdown (game-neutral COUNTDOWN_S is arena's — kept separate). */
export const OVERRUN_COUNTDOWN_S = 3;

// --- field / players ---
export const OVERRUN_FIELD_M = 30;
export const PLAYER_RADIUS_M = 0.75;
export const PLAYER_HEALTH = 100;
export const PLAYER_SPEED_MS = 4;

// --- caps (snapshot-size + host-CPU guards) ---
export const MAX_ENEMIES = 60;
export const MAX_PICKUPS = 24;
export const MAX_EVENTS = 32;
/** Events older than this many ticks are pruned (renderer consumes them fast). */
export const EVENT_TTL_TICKS = 6;

// --- waves ---
export const SPAWNS_PER_TICK = 2;
export const INTERMISSION_S = 3;
/** Synced hold between campaign stages — the comic beat plays while spawning is paused. */
export const COMIC_INTERSTITIAL_S = 2.5;
/** Wave-1 enemies move at this fraction of their base speed (onboarding-friendly ramp). */
export const WAVE1_SPEED_MULT = 0.85;

// --- tank Rush ability (deterministic charge) ---
/** Seconds a tank chases normally between Rushes (counts down; then it telegraphs). */
export const RUSH_COOLDOWN_S = 3;
/** Telegraph: tank freezes, fire-charges, and locks the target's ground position. */
export const RUSH_CHARGE_S = 0.5;
/** Recovery freeze after the charge lands (or whiffs). */
export const RUSH_RECOVER_S = 0.5;
/** Safety cap on the charge run so an unreachable lock can't stall the tank forever. */
export const RUSH_RUN_MAX_S = 2;
/** Charge speed — 2× the rusher base speed (4.5 m/s). */
export const RUSH_SPEED_MS = 9;
/** Players within this radius of the landing point take the Rush hit. */
export const RUSH_HIT_RADIUS_M = 1.8;
/** Rush hit damage as a fraction of the victim's max health. */
export const RUSH_HIT_FRACTION = 0.5;

// --- flamethrower (continuous cone + burn-over-time) ---
/** Half-angle of the flame cone (radians): enemies within ±this of the aim are torched. */
export const FLAME_CONE_RAD = 0.52; // ~30°
/** Burn seconds (re)applied to every enemy the cone touches — refreshed while the stream holds. */
export const FLAME_BURN_S = 1.6;
/** Damage per second an enemy takes while burning (independent of the direct cone hit). */
export const BURN_DPS = 14;

// --- rocket launcher (travelling projectile + AoE airburst) ---
/** Rocket flight speed (m/s). */
export const ROCKET_SPEED_MS = 20;
/** Explosion radius (m): every enemy within takes the full burst. */
export const ROCKET_BLAST_RADIUS_M = 3.2;
/** Explosion damage dealt once to each enemy in radius (big — clears rusher packs, dents tanks). */
export const ROCKET_BLAST_DAMAGE = 120;
/** Muzzle offset (m) the rocket spawns ahead of the shooter so it doesn't detonate on itself. */
export const ROCKET_MUZZLE_M = 0.9;
/** Hard cap on rockets in flight (anti-flood / snapshot-size guard). */
export const MAX_PROJECTILES = 12;

// --- spitter (ranged kiter) + spit acid pool ---
/** Distance the spitter tries to hold from its target (kites in/out toward this). */
export const SPITTER_RANGE_M = 8;
/** Hysteresis band around SPITTER_RANGE_M — inside it the spitter holds instead of jittering. */
export const SPITTER_KITE_BAND_M = 1.5;
/** Seconds the spitter kites between spits (counts down; then it telegraphs a spit). */
export const SPIT_COOLDOWN_S = 3;
/** Telegraph: the spitter freezes and locks the target's ground position before firing. */
export const SPIT_CHARGE_S = 0.6;
/** Warning seconds on the spawned pool before it turns dangerous (the glob's arc/land tell). */
export const SPIT_HAZARD_TELEGRAPH_S = 0.8;
/** Seconds the acid pool lingers dealing damage after its telegraph elapses. */
export const SPIT_HAZARD_DURATION_S = 2.5;
/** Radius of the acid pool (m). */
export const SPIT_HAZARD_RADIUS_M = 2;
/** Damage per second a player takes while standing in an active acid pool. */
export const SPIT_DPS = 22;

// --- exploder (death blast) ---
/** Fuse: seconds the blast telegraphs after the exploder dies, before it detonates (dodge window). */
export const EXPLODER_FUSE_S = 0.5;
/** Radius of the death blast (m). */
export const EXPLODER_BLAST_RADIUS_M = 3;
/** One-shot damage to every player caught in the blast when it detonates. */
export const EXPLODER_BLAST_DAMAGE = 35;

// --- hive (spawner) ---
/** Seconds between the hive's swarmling broods (counts down; then it births a brood). */
export const HIVE_SPAWN_INTERVAL_S = 4;
/** Swarmlings birthed per brood. */
export const HIVE_BROOD_SIZE = 3;
/** Ring radius (m) the brood spawns on around the hive. */
export const HIVE_BROOD_RING_M = 1.5;

// --- elites + per-stage scaling (campaign only; survival keeps its flat model) ---
/** Elites (frenzied rushers / armored tanks) start appearing from this campaign stage. */
export const ELITE_MIN_STAGE = 3;
/** Per-spawn chance an eligible rusher/tank rolls elite (deterministic hash draw). */
export const ELITE_CHANCE = 0.15;
/** Enemy max-HP gains this fraction per campaign stage past the first (stage 6 ≈ +60%). */
export const STAGE_HEALTH_SCALAR = 0.12;

// --- Kraken mega-boss (stage-5 finale) ---
/** Base HP, plus KRAKEN_HP_PER_PLAYER × partySize — the boss scales to the party it faces. */
export const KRAKEN_BASE_HP = 1800;
export const KRAKEN_HP_PER_PLAYER = 900;
/** Slow, deliberate menace — it corners you into its tentacle strikes rather than chasing you down. */
export const KRAKEN_SPEED_MS = 1.2;
/** Heavy contact damage — do not hug the Kraken. */
export const KRAKEN_CONTACT_DAMAGE = 25;
/** Seconds between tentacle volleys (point-strikes or a sweep). */
export const KRAKEN_ATTACK_INTERVAL_S = 3;
/** Telegraph (fuse) on every tentacle strike — the warning window to clear the slam zone. */
export const KRAKEN_STRIKE_TELEGRAPH_S = 0.8;
/** Radius of one tentacle-slam circle (m). */
export const KRAKEN_STRIKE_RADIUS_M = 2.2;
/** One-shot damage of a point-strike slam (targets a player's locked position). */
export const KRAKEN_STRIKE_DAMAGE = 40;
/** Max simultaneous point-strikes; the actual count scales with party (see stepKraken). */
export const KRAKEN_MAX_STRIKES = 4;
/** Sweep: a rotating radial line of slam circles this long (m), out from the boss. */
export const KRAKEN_SWEEP_LENGTH_M = 12;
/** One-shot damage of a single sweep node. */
export const KRAKEN_SWEEP_DAMAGE = 35;

// --- bullet-hit feedback ---
/** Seconds an enemy can't move after taking a hit. */
export const ENEMY_HIT_STUN_S = 0.3;
/** Meters an enemy is shoved along the pellet's ray on its first damaging pellet per fireTick. */
export const ENEMY_HIT_KNOCKBACK_M = 0.5;

// --- enemy AI ---
/** Enemies closer than this push apart — kept near body-overlap distance so the horde declusters
 *  WITHOUT being held off the player (a wide radius would ring-repel them out of attack range). */
export const ENEMY_SEPARATION_M = 0.85;
/** How hard the separation nudge pushes, relative to one tick of movement (gentle: overlap relief). */
export const ENEMY_SEPARATION_WEIGHT = 0.5;
/** Enemies aim this many ticks ahead of the target's current velocity, to cut off the player's path. */
export const ENEMY_LEAD_TICKS = 9;
/** Cap on how far ahead the intercept lead can reach (m), so fast strafing doesn't fling the aim point. */
export const ENEMY_LEAD_MAX_M = 4;
/** Seconds an enemy holds still right after landing an attack, giving the player a beat to escape. */
export const ENEMY_ATTACK_FREEZE_S = 0.1;
/** Extra reach on the contact-damage check so the separation jitter can't nudge an enemy just
 *  out of "touching" range and silently cancel its attack. */
export const ENEMY_CONTACT_SLACK_M = 0.3;

// --- downed / revive ---
export const REVIVE_RANGE_M = 2;
export const REVIVE_S = 3;
export const REVIVE_HEALTH = 50;

// --- pickups / drops ---
export const PICKUP_RADIUS_M = 1;
export const PICKUP_TTL_S = 12;
export const MEDKIT_HEAL = 40;
/** After swapping guns, ignore weapon pickups briefly so you don't instantly re-swap. */
export const SWAP_GUARD_S = 0.5;
export const DROP_WEAPON_P = 0.1;
export const DROP_MEDKIT_P = 0.06;
/** Kills without a drop before one is forced (anti-dry-streak). */
export const PITY_LIMIT = 25;

// --- XP / perks ---
export const XP_BASE = 20;
export const XP_PER_LEVEL = 15;

// --- roster ---
/** Mesh ceiling — the P2P full mesh degrades past this many peers. */
export const MAX_OVERRUN_PLAYERS = 8;
