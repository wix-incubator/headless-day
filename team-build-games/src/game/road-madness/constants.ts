/** Canonical Road Madness tuning shared by the pure sim. */

export const ROAD_TICK_HZ = 30;
export const ROAD_DT = 1 / ROAD_TICK_HZ;
export const MAX_CATCHUP_TICKS = 5;

export const ROAD_ARENA_WIDTH_M = 30;
export const ROAD_ARENA_HEIGHT_M = 20;

export const CAR_RESTITUTION = 0.42;
export const WALL_RESTITUTION = 0.28;
export const IMPACT_COOLDOWN_S = 0.35;
export const MIN_DAMAGE_SPEED_MS = 3;
export const BUMPER_HALF_ANGLE_DEG = 55;
export const EVENT_TTL_TICKS = 5;

/** A full tank provides a little over two seconds of continuous boost. */
export const NITRO_DRAIN_PER_S = 0.44;
/** Empty-to-full recharge time is roughly seven seconds while not boosting. */
export const NITRO_RECHARGE_PER_S = 0.15;
export const NITRO_ACCELERATION_MULT = 1.55;
export const NITRO_MAX_SPEED_MULT = 1.3;
export const WRECK_LINGER_S = 5;
export const WRECK_LINGER_TICKS = Math.round(WRECK_LINGER_S * ROAD_TICK_HZ);

export const SUDDEN_DEATH_START_S = 75;
export const SUDDEN_DEATH_SHRINK_S = 30;
export const ROUND_TIMEOUT_S = 120;
export const SUDDEN_DEATH_MAX_INSET_X_M = 7.5;
export const SUDDEN_DEATH_MAX_INSET_Y_M = 5;
export const SUDDEN_DEATH_MAX_DAMAGE_MULT = 2.5;
export const ROUND_BREAK_S = 2.4;

/** Arena feature tuning. Towers are half the Derby car's collision radius. */
export const SPIKE_TOWER_RADIUS_M = 0.54;
export const SPIKE_TOWER_RESTITUTION = 0.62;
export const SPIKE_TOWER_DAMAGE_PER_MS = 4.2;
export const SPIKE_TOWER_COOLDOWN_S = 0.45;
export const SPEED_PAD_RADIUS_M = 1.25;
export const SPEED_PAD_MIN_LAUNCH_MS = 8.5;
export const SPEED_PAD_BONUS_MS = 4.5;
export const SPEED_PAD_COOLDOWN_S = 1.1;
