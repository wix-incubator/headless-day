import type { EnemyKind, GunId } from "./types";

export type ThreeUrls = [string, string, string];

export interface OverrunVisualAssets {
  terrain: Array<{ name: string; url: string }>;
  player: {
    idle: string;
    run: [string, string];
    downed: string;
  };
  weapons: Record<GunId, string>;
  /** Per-kind sprite sets. Partial: kinds without packed art fall back to procedural rendering. */
  enemies: Partial<Record<EnemyKind, { alive: ThreeUrls; dead: ThreeUrls }>>;
}

export interface OverrunAssetManifest {
  version: 1;
  music: { lobby: string; battle: string };
  sfx: {
    shots: Record<GunId, ThreeUrls>;
    reload: Record<GunId, string[]>;
    enemyHit: ThreeUrls;
    playerHit: ThreeUrls;
    weaponPickup: string[];
    medkitPickup: string[];
    levelUp: string[];
  };
  visuals: OverrunVisualAssets;
}

type JsonObject = Record<string, unknown>;

function objectAt(value: unknown, path: string): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${path} must be an object`);
  return value as JsonObject;
}

function textAt(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${path} must be a non-empty string`);
  return value;
}

function urlAt(value: unknown, path: string): string {
  const raw = textAt(value, path);
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`${path} must be a valid URL`);
  }
  if (parsed.protocol !== "https:") throw new Error(`${path} must use HTTPS`);
  return parsed.toString();
}

function urlArray(value: unknown, path: string, exactLength?: number): string[] {
  if (!Array.isArray(value) || value.length === 0) throw new Error(`${path} must be a non-empty array`);
  if (exactLength !== undefined && value.length !== exactLength) throw new Error(`${path} must contain ${exactLength} URLs`);
  return value.map((item, index) => urlAt(item, `${path}[${index}]`));
}

function threeUrls(value: unknown, path: string): ThreeUrls {
  return urlArray(value, path, 3) as ThreeUrls;
}

export function parseOverrunAssetManifest(value: unknown): OverrunAssetManifest {
  const root = objectAt(value, "manifest");
  if (root.version !== 1) throw new Error("manifest.version must be 1");
  const music = objectAt(root.music, "manifest.music");
  const sfx = objectAt(root.sfx, "manifest.sfx");
  const shots = objectAt(sfx.shots, "manifest.sfx.shots");
  const reload = objectAt(sfx.reload, "manifest.sfx.reload");
  const visuals = objectAt(root.visuals, "manifest.visuals");
  const player = objectAt(visuals.player, "manifest.visuals.player");
  const weapons = objectAt(visuals.weapons, "manifest.visuals.weapons");
  const enemies = objectAt(visuals.enemies, "manifest.visuals.enemies");
  const rusher = objectAt(enemies.rusher, "manifest.visuals.enemies.rusher");
  const tank = objectAt(enemies.tank, "manifest.visuals.enemies.tank");
  const terrainRaw = visuals.terrain;
  if (!Array.isArray(terrainRaw) || terrainRaw.length !== 5) throw new Error("manifest.visuals.terrain must contain 5 entries");

  const guns = ["pistol", "shotgun", "rifle"] as const;
  const parsedShots = {} as Record<GunId, ThreeUrls>;
  const parsedReload = {} as Record<GunId, string[]>;
  const parsedWeapons = {} as Record<GunId, string>;
  for (const gun of guns) {
    parsedShots[gun] = threeUrls(shots[gun], `manifest.sfx.shots.${gun}`);
    parsedReload[gun] = urlArray(reload[gun], `manifest.sfx.reload.${gun}`);
    parsedWeapons[gun] = urlAt(weapons[gun], `manifest.visuals.weapons.${gun}`);
  }

  return {
    version: 1,
    music: {
      lobby: urlAt(music.lobby, "manifest.music.lobby"),
      battle: urlAt(music.battle, "manifest.music.battle"),
    },
    sfx: {
      shots: parsedShots,
      reload: parsedReload,
      enemyHit: threeUrls(sfx.enemyHit, "manifest.sfx.enemyHit"),
      playerHit: threeUrls(sfx.playerHit, "manifest.sfx.playerHit"),
      weaponPickup: urlArray(sfx.weaponPickup, "manifest.sfx.weaponPickup"),
      medkitPickup: urlArray(sfx.medkitPickup, "manifest.sfx.medkitPickup"),
      levelUp: urlArray(sfx.levelUp, "manifest.sfx.levelUp"),
    },
    visuals: {
      terrain: terrainRaw.map((item, index) => {
        const entry = objectAt(item, `manifest.visuals.terrain[${index}]`);
        return {
          name: textAt(entry.name, `manifest.visuals.terrain[${index}].name`),
          url: urlAt(entry.url, `manifest.visuals.terrain[${index}].url`),
        };
      }),
      player: {
        idle: urlAt(player.idle, "manifest.visuals.player.idle"),
        run: urlArray(player.run, "manifest.visuals.player.run", 2) as [string, string],
        downed: urlAt(player.downed, "manifest.visuals.player.downed"),
      },
      weapons: parsedWeapons,
      enemies: {
        rusher: {
          alive: threeUrls(rusher.alive, "manifest.visuals.enemies.rusher.alive"),
          dead: threeUrls(rusher.dead, "manifest.visuals.enemies.rusher.dead"),
        },
        tank: {
          alive: threeUrls(tank.alive, "manifest.visuals.enemies.tank.alive"),
          dead: threeUrls(tank.dead, "manifest.visuals.enemies.tank.dead"),
        },
      },
    },
  };
}

export async function fetchOverrunAssetManifest(
  url: string,
  fetcher: typeof fetch = fetch,
): Promise<OverrunAssetManifest> {
  const response = await fetcher(url);
  if (!response.ok) throw new Error(`Overrun asset manifest failed to load (${response.status})`);
  return parseOverrunAssetManifest(await response.json());
}
