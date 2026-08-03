/**
 * Engine/transport-free domain types for the Overrun sim core. Plain data only.
 * Coordinates in METERS, +y down (arena convention). The world carries its own
 * seed so any peer can reproduce every future random draw after a host migration.
 */

/** 2D vector in world meters; +y is down. */
export interface Vec2 { x: number; y: number; }
/** Held movement keys for one frame. */
export interface InputState { up: boolean; down: boolean; left: boolean; right: boolean; }
export type PlayerId = string;

export type GunId = "pistol" | "shotgun" | "rifle" | "autorifle" | "smg" | "dmr" | "flamethrower" | "rocket";
export type EnemyKind = "rusher" | "tank" | "swarmling" | "spitter" | "exploder" | "hive" | "kraken";
export type PickupKind = "shotgun" | "rifle" | "autorifle" | "smg" | "dmr" | "flamethrower" | "rocket" | "medkit";
/** Pickup kinds that are weapons (everything a kill can drop except the medkit). */
export type DroppableGun = Exclude<PickupKind, "medkit">;
export type ShooterStatus = "alive" | "downed" | "dead";
export type ShooterPhase = "playing" | "ended" | "victory";
/** Campaign = finite staged run (win via `victory`); Survival = endless (ends only on wipe). */
export type OverrunMode = "campaign" | "survival";
export type PerkId = "trigger" | "sprint" | "power" | "vitality" | "hands" | "magnet";

export interface AmmoState {
  mag: number;
  /** Rounds outside the mag. Ignored for the pistol (infinite reserve). */
  reserve: number;
  /** Seconds left of an active reload (0 = not reloading). Blocks firing, not movement. */
  reloadRemaining: number;
  /** Seconds until the next shot is allowed (RPM gate). */
  fireCooldown: number;
}

/** Cumulative run stats — the merch-print scorecard inputs. */
export interface ShooterStats {
  /** Trigger pulls (a shotgun blast counts once, not per pellet). */
  shots: number;
  /** Trigger pulls that damaged ≥1 enemy. */
  hits: number;
  kills: number;
}

/** One queued level-up: three distinct perk choices rolled deterministically. */
export interface PerkOffer {
  choices: [PerkId, PerkId, PerkId];
}

export interface ShooterPlayer {
  id: PlayerId;
  pos: Vec2;
  /** Free-aim angle (radians), host-consumed input echoed into the world for rendering. */
  aim: number;
  health: number;
  status: ShooterStatus;
  gun: GunId;
  ammo: AmmoState;
  xp: number;
  level: number;
  perks: PerkId[];
  /** FIFO queue of unclaimed level-up offers (head is the active one in the HUD). */
  offers: PerkOffer[];
  stats: ShooterStats;
  /** Seconds of teammate-proximity revive accumulated while downed (resets when alone). */
  reviveProgress: number;
  /** Seconds left of the post-swap pickup guard. */
  swapGuard: number;
}

/**
 * Enemy ability state machine (append-only — the wire encodes this by index).
 * Tank Rush: chase (`none`) → `rushCharge` (telegraph) → `rushRun` (charge) → `rushRecover`.
 * Spitter: kite (`none`) → `spitCharge` (telegraph + lock, then emits a spit hazard back to `none`).
 */
export type EnemySpecial = "none" | "rushCharge" | "rushRun" | "rushRecover" | "spitCharge";

/**
 * A "kind" of ground hazard (append-only — wire index). `spit` = spitter's lingering acid pool
 * (continuous dps); `blast` = exploder's death detonation (one-shot burst); `strike` = a Kraken
 * tentacle slam (one-shot burst, used for both its point-strikes and sweep nodes).
 */
export type HazardKind = "spit" | "blast" | "strike";

/**
 * A ground-area threat that lives in the world independent of any enemy. It warns for `telegraph`
 * seconds, then does damage two ways depending on the kind:
 *  - POOL (dps > 0): drains `dps`/sec from players inside `radius` for `duration` seconds, then despawns.
 *  - BURST (burst > 0): on the tick its telegraph elapses, deals `burst` once to players inside `radius`,
 *    then is spent (it never enters an active-duration phase).
 * The spitter's acid pool is the first pool; the exploder's death blast is the first burst; the stage-5
 * boss reuses both shapes for its tentacle strikes.
 */
export interface Hazard {
  /** Deterministic `hz:${enemyId}:${tick}` of the spit/blast that created it. */
  id: string;
  kind: HazardKind;
  pos: Vec2;
  radius: number;
  /** Seconds of warning before it deals damage (counts down first; 0 = active/detonating). */
  telegraph: number;
  /** Pool only: seconds of active damage remaining once the telegraph elapses; despawns at 0. */
  duration: number;
  /** Pool damage per second dealt to players within `radius` while active (0 for bursts). */
  dps: number;
  /** Burst one-shot damage dealt to players within `radius` when the telegraph elapses (absent for pools). */
  burst?: number;
}

/**
 * A rocket in flight. Travels straight at `speed` along `dir` until it strikes an enemy, runs out of
 * `remaining` range, or leaves the field — then it detonates for an AoE burst (see the sim's
 * projectile step). `ownerId` attributes the explosion's kills for XP.
 */
export interface Projectile {
  /** Deterministic `pj:${ownerId}:${spawnTick}`. */
  id: string;
  pos: Vec2;
  /** Unit heading. */
  dir: Vec2;
  /** Travel speed (m/s). */
  speed: number;
  /** Meters of range left before it detonates at range end. */
  remaining: number;
  /** Player who fired it — the explosion's kills award them XP. */
  ownerId: PlayerId;
}

export interface Enemy {
  /** Deterministic `e${spawnSeq}`. */
  id: string;
  kind: EnemyKind;
  pos: Vec2;
  health: number;
  /** Seconds until this enemy may deal contact damage again. */
  attackCooldown: number;
  /** Seconds left of a bullet-hit micro-stun (0 = free to move). */
  stunRemaining: number;
  /** Tank Rush state (absent/`none` = normal chase). Only tanks use it. */
  special?: EnemySpecial;
  /** Countdown within the current special state — or, while `none`, time until the next Rush. */
  specialRemaining?: number;
  /** Locked ground target for a Rush charge (fixed at telegraph start; null when not rushing). */
  rushTo?: Vec2 | null;
  /** Seconds of remaining flamethrower burn (damage-over-time). Absent/0 = not on fire. */
  burning?: number;
  /**
   * Campaign elite (frenzied rusher / armored tank): decided by a deterministic hash at spawn. Buffs
   * this enemy's HP/speed/damage per `eliteMods(kind)`. Absent = a normal spawn. Optional so old
   * snapshots and non-elite enemies need not carry it.
   */
  elite?: boolean;
}

export interface Pickup {
  /** Deterministic `pk:${enemyId}` of the enemy that dropped it. */
  id: string;
  kind: PickupKind;
  pos: Vec2;
  /** Seconds left before the pickup despawns. */
  ttl: number;
}

/** Transient, render-only facts (tracers, kill pops, SFX). Pruned after EVENT_TTL_TICKS. */
export type ShooterEvent =
  | { tick: number; kind: "shot"; from: Vec2; to: Vec2; gun: GunId }
  | { tick: number; kind: "kill"; pos: Vec2; enemy: EnemyKind }
  | { tick: number; kind: "pickup"; pos: Vec2; item: PickupKind }
  | { tick: number; kind: "levelup"; playerId: PlayerId }
  | { tick: number; kind: "downed"; playerId: PlayerId }
  | { tick: number; kind: "revived"; playerId: PlayerId }
  | { tick: number; kind: "hit"; pos: Vec2 }
  | { tick: number; kind: "playerHit"; playerId: PlayerId }
  | { tick: number; kind: "blast"; pos: Vec2; radius: number };

/** What a client sends per tick — never positions/health/enemies. */
export interface ShooterIntent {
  move: InputState;
  /** Free-aim angle in radians (mouse); host echoes it into the player state. */
  aim?: number;
  /** HELD state — all slice guns are auto (hold to fire). */
  fire: boolean;
  /** Rising-edge: reload requested this tick. */
  reload: boolean;
  /** Rising-edge: claim choice N of the head perk offer (null = no pick). */
  perkPick: 0 | 1 | 2 | null;
}

/** Raw held-key state read by the renderer each frame. */
export interface RawShooterInput extends InputState {
  fire: boolean;
  reload: boolean;
  aim?: number;
  pick1: boolean;
  pick2: boolean;
  pick3: boolean;
}

/** Edge-detection memory carried between frames. */
export interface ShooterInputMemory {
  reloadHeld: boolean;
  pick1Held: boolean;
  pick2Held: boolean;
  pick3Held: boolean;
}

export interface ShooterWorld {
  tick: number;
  phase: ShooterPhase;
  /** Campaign (finite, staged) vs survival (endless). Set at match start; constant thereafter. */
  mode: OverrunMode;
  /** Match seed — rides every keyframe so any peer reproduces all draws. */
  seed: number;
  /** Current wave number (1-based; 0 = not started). */
  wave: number;
  /** Player count frozen at the current wave's start (proportional budget input). */
  partySize: number;
  /** Enemy kinds queued to spawn this wave (drained SPAWNS_PER_TICK per tick under MAX_ENEMIES). */
  pending: EnemyKind[];
  /** Seconds left of the between-waves breather (0 = wave in progress). */
  intermission: number;
  /**
   * Campaign only: seconds left of the synced between-stage comic beat. While > 0 the sim holds
   * (no spawning) and the client shows the interstitial. Absent/0 = no interstitial. Optional so old
   * snapshots + non-campaign worlds need not carry it.
   */
  stageIntroRemaining?: number;
  players: Record<PlayerId, ShooterPlayer>;
  enemies: Enemy[];
  pickups: Pickup[];
  /**
   * Active ground hazards (spitter acid pools; later boss strikes). Optional so old snapshots and
   * hazard-free worlds need not carry it — treated as `[]` everywhere it's read.
   */
  hazards?: Hazard[];
  /** Rockets in flight. Optional so old snapshots and rocket-free worlds need not carry it. */
  projectiles?: Projectile[];
  events: ShooterEvent[];
  /** Party score: Σ enemy scoreValue × wave at kill time. */
  score: number;
  /** Monotonic spawn counter — enemy ids + spawn-position draws key off it. */
  spawnSeq: number;
  /** Kills since the last drop (forces one at PITY_LIMIT). */
  pity: number;
}
