import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Phaser from "phaser";
import {
  ROAD_HEIGHT,
  ROAD_WIDTH,
  RoadMadnessScene,
  type RoadHudState,
  type RoadRenderEvent,
  type RoadSceneConfig,
} from "../../../game/road-madness/render/scene";
import {
  SoloRoadDriver,
  type SoloRoadSnapshot,
} from "../../../game/road-madness/soloDriver";
import type {
  BotDifficulty,
  RoadBestOf,
  RoadWorld,
  VehicleClass,
} from "../../../game/road-madness/types";
import { PLAYABLE_DERBY_VEHICLES, VEHICLES } from "../../../game/road-madness/vehicles";
import { Sfx } from "../../../game/audio/sfx";
import RoadGarageShowcase from "./RoadGarageShowcase";

const FRESH_HUD: RoadHudState = {
  countdown: 3,
  health: VEHICLES.derby.health,
  maxHealth: VEHICLES.derby.health,
  speed: 0,
  status: "alive",
  alive: 4,
  total: 4,
  damageDealt: 0,
  elapsed: 0,
  matchElapsed: 0,
  nitro: 1,
  boosting: false,
  phase: "playing",
  roundNumber: 1,
  bestOf: 3,
  roundWins: { driver: 0, "rival-1": 0, "rival-2": 0, "rival-3": 0 },
  roundWinnerId: null,
  roundEndReason: null,
  roundBreak: 0,
  suddenDeath: false,
  damageMultiplier: 1,
};

const LOCAL_MATCH_KEY = "road-madness:local-match:v4";
const LOCAL_MATCH_MAX_AGE_MS = 30 * 60 * 1000;

interface PersistedLocalMatch {
  version: 4;
  savedAt: number;
  vehicle: "derby" | "monster";
  nitroEnabled: boolean;
  bestOf: RoadBestOf;
  botDifficulty: BotDifficulty;
  snapshot: SoloRoadSnapshot;
}

function loadPersistedMatch(): PersistedLocalMatch | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(LOCAL_MATCH_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<PersistedLocalMatch>;
    const world = value.snapshot?.world;
    const valid =
      value.version === 4 &&
      typeof value.savedAt === "number" &&
      Date.now() - value.savedAt <= LOCAL_MATCH_MAX_AGE_MS &&
      (value.vehicle === "derby" || value.vehicle === "monster") &&
      typeof value.nitroEnabled === "boolean" &&
      (value.bestOf === 1 || value.bestOf === 3 || value.bestOf === 5) &&
      (value.botDifficulty === "rookie" || value.botDifficulty === "mad" || value.botDifficulty === "maniac") &&
      typeof value.snapshot?.countdownLeft === "number" &&
      typeof value.snapshot?.roundBreakLeft === "number" &&
      world?.mode === "last-madman" &&
      (world.phase === "playing" || world.phase === "ended") &&
      typeof world.cars === "object" &&
      world.cars !== null &&
      !!world.cars.driver &&
      typeof world.rules?.nitroEnabled === "boolean" &&
      typeof world.roundNumber === "number" &&
      typeof world.roundWins === "object" &&
      typeof world.arenaCooldowns === "object" &&
      typeof world.cars.driver.nitro === "number";
    if (valid) return value as PersistedLocalMatch;
  } catch {
    // A corrupt/private-mode storage entry should never prevent the garage from opening.
  }
  clearPersistedMatch();
  return null;
}

function clearPersistedMatch(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(LOCAL_MATCH_KEY);
  } catch {
    // Storage can be unavailable in hardened/private browser contexts.
  }
}

function hudFromSnapshot(snapshot: SoloRoadSnapshot): RoadHudState {
  const local = snapshot.world.cars.driver;
  if (!local) return FRESH_HUD;
  return {
    countdown: Math.ceil(snapshot.countdownLeft),
    health: local.health,
    maxHealth: local.maxHealth,
    speed: Math.hypot(local.vel.x, local.vel.y),
    status: local.status,
    alive: Object.values(snapshot.world.cars).filter((car) => car.status === "alive").length,
    total: Object.keys(snapshot.world.cars).length,
    damageDealt: local.damageDealt,
    elapsed: snapshot.world.elapsed,
    matchElapsed: snapshot.world.matchElapsed,
    nitro: local.nitro,
    boosting: local.boosting,
    phase: snapshot.world.phase,
    roundNumber: snapshot.world.roundNumber,
    bestOf: snapshot.world.rules.bestOf,
    roundWins: snapshot.world.roundWins,
    roundWinnerId: snapshot.world.roundWinnerId,
    roundEndReason: snapshot.world.roundEndReason,
    roundBreak: Math.ceil(snapshot.roundBreakLeft),
    suddenDeath: snapshot.world.suddenDeath,
    damageMultiplier: snapshot.world.damageMultiplier,
  };
}

const MODES = [
  {
    id: "last-madman",
    name: "Last Madman Standing",
    eyebrow: "Playable now",
    copy: "Ram with your bumpers, protect your sides, and be the last engine running.",
    playable: true,
  },
  {
    id: "race",
    name: "Race",
    eyebrow: "Roadmap",
    copy: "1, 3, or 5 laps with rear chase and cabin views.",
    playable: false,
  },
  {
    id: "carnage",
    name: "Carnage",
    eyebrow: "Roadmap",
    copy: "Two minutes to dismantle a monster-zombie city.",
    playable: false,
  },
  {
    id: "bomb-tag",
    name: "Bomb Tag",
    eyebrow: "Roadmap",
    copy: "Pass the live bomb with a clean ram before the fuse expires.",
    playable: false,
  },
] as const;

const BEST_OF_OPTIONS: RoadBestOf[] = [1, 3, 5];
const BOT_DIFFICULTIES: Array<{ id: BotDifficulty; name: string; copy: string }> = [
  { id: "rookie", name: "Rookie", copy: "Slower reads and rare nitro runs." },
  { id: "mad", name: "Mad", copy: "Balanced chase pressure." },
  { id: "maniac", name: "Maniac", copy: "Hard leads, early drifts, frequent boosts." },
];

export default function RoadMadness() {
  const [restored] = useState<PersistedLocalMatch | null>(() => loadPersistedMatch());
  const [initialDriver] = useState<SoloRoadDriver | null>(() =>
    restored
      ? new SoloRoadDriver(restored.vehicle, restored.snapshot, {
          nitroEnabled: restored.nitroEnabled,
          bestOf: restored.bestOf,
          botDifficulty: restored.botDifficulty,
        })
      : null,
  );
  const frameRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const driverRef = useRef<SoloRoadDriver | null>(initialDriver);
  const sfxRef = useRef(new Sfx());
  const [vehicle, setVehicle] = useState<VehicleClass>(restored?.vehicle ?? "derby");
  const [nitroEnabled, setNitroEnabled] = useState(restored?.nitroEnabled ?? true);
  const [bestOf, setBestOf] = useState<RoadBestOf>(restored?.bestOf ?? 3);
  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty>(restored?.botDifficulty ?? "mad");
  const [playing, setPlaying] = useState(!!restored);
  const [epoch, setEpoch] = useState(0);
  const [hud, setHud] = useState<RoadHudState>(() =>
    restored ? hudFromSnapshot(restored.snapshot) : FRESH_HUD,
  );
  const [finalWorld, setFinalWorld] = useState<RoadWorld | null>(() =>
    restored?.snapshot.world.phase === "ended" ? restored.snapshot.world : null,
  );

  const onHud = useCallback((next: RoadHudState) => setHud(next), []);
  const onEvent = useCallback((event: RoadRenderEvent) => {
    if (event.type === "impact") sfxRef.current.play("hit");
    else if (event.type === "nitro" && event.local) sfxRef.current.play("dash");
    else if (event.type === "wrecked" && event.local) sfxRef.current.play("gameover");
  }, []);
  const onEnd = useCallback((world: RoadWorld) => {
    setFinalWorld(world);
    if (world.winnerId === driverRef.current?.localId) sfxRef.current.play("win");
  }, []);

  const start = useCallback(() => {
    sfxRef.current.resume();
    clearPersistedMatch();
    const nextDriver = new SoloRoadDriver(vehicle, undefined, {
      nitroEnabled,
      bestOf,
      botDifficulty,
    });
    driverRef.current = nextDriver;
    setHud({
      ...FRESH_HUD,
      health: VEHICLES[vehicle].health,
      maxHealth: VEHICLES[vehicle].health,
    });
    setFinalWorld(null);
    setPlaying(true);
    setEpoch((value) => value + 1);
  }, [bestOf, botDifficulty, nitroEnabled, vehicle]);

  const garage = useCallback(() => {
    clearPersistedMatch();
    setPlaying(false);
    setFinalWorld(null);
    driverRef.current = null;
  }, []);

  // Vite's dev server can remount a client-only island whenever imported source changes.
  // Keep a lightweight checkpoint so active local play resumes instead of showing
  // the garage after an unrelated HMR/full-page reload.
  useEffect(() => {
    if (!playing) {
      clearPersistedMatch();
      return;
    }
    const persist = () => {
      const driver = driverRef.current;
      if (!driver) return;
      const payload: PersistedLocalMatch = {
        version: 4,
        savedAt: Date.now(),
        vehicle: vehicle === "monster" ? "monster" : "derby",
        nitroEnabled,
        bestOf,
        botDifficulty,
        snapshot: driver.snapshot(),
      };
      try {
        window.sessionStorage.setItem(LOCAL_MATCH_KEY, JSON.stringify(payload));
      } catch {
        // The game still runs when storage is disabled; only HMR recovery is lost.
      }
    };
    persist();
    const interval = window.setInterval(persist, 250);
    window.addEventListener("pagehide", persist);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("pagehide", persist);
      persist();
    };
  }, [bestOf, botDifficulty, epoch, nitroEnabled, playing, vehicle]);

  useEffect(() => {
    gameRef.current?.destroy(true);
    gameRef.current = null;
    if (!playing || !hostRef.current || !driverRef.current) return;
    const cfg: RoadSceneConfig = {
      driver: driverRef.current,
      onHud,
      onEvent,
      onEnd,
    };
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      width: ROAD_WIDTH,
      height: ROAD_HEIGHT,
      parent: hostRef.current,
      backgroundColor: "#130f12",
      scene: [RoadMadnessScene],
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_HORIZONTALLY },
      callbacks: { preBoot: (instance) => instance.registry.set("cfg", cfg) },
    });
    gameRef.current = game;
    if (import.meta.env.DEV) {
      (window as unknown as { __roadMadnessGame?: Phaser.Game }).__roadMadnessGame = game;
    }
    const focus = window.requestAnimationFrame(() => frameRef.current?.focus({ preventScroll: true }));
    return () => {
      window.cancelAnimationFrame(focus);
      game.destroy(true);
      if (gameRef.current === game) gameRef.current = null;
    };
  }, [epoch, onEnd, onEvent, onHud, playing]);

  if (!playing) {
    return (
      <div className="rounded-xl border border-amber-400/20 bg-[#130f12] p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-display text-[8px] uppercase tracking-[0.2em] text-amber-300">Choose chaos</p>
            <h2 className="mt-2 font-display text-lg text-white">Select a mode</h2>
          </div>
          <span className="rounded border border-cyan-400/30 px-2 py-1 font-display text-[8px] text-cyan-300">
            Local alpha · online rooms next
          </span>
        </div>

        <div className="mt-5">
          <RoadGarageShowcase vehicle={vehicle} />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {MODES.map((mode) => (
            <div
              key={mode.id}
              className={`rounded-lg border p-4 ${
                mode.playable
                  ? "border-amber-300/55 bg-amber-300/5 shadow-[0_0_20px_rgb(251_191_36/0.08)]"
                  : "border-white/10 bg-white/[0.02] opacity-65"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-display text-[10px] text-white">{mode.name}</h3>
                <span className={`font-display text-[7px] ${mode.playable ? "text-emerald-400" : "text-neutral-500"}`}>
                  {mode.eyebrow}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-neutral-400">{mode.copy}</p>
            </div>
          ))}
        </div>

        <div className="mt-7">
          <p className="font-display text-[8px] uppercase tracking-[0.2em] text-amber-300">Choose your wreck</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {PLAYABLE_DERBY_VEHICLES.map((id) => {
              const def = VEHICLES[id];
              const active = id === vehicle;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setVehicle(id)}
                  className={`rounded-lg border p-4 text-left transition ${
                    active ? "border-cyan-400 bg-cyan-400/10" : "border-white/10 hover:border-white/30"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-display text-[10px] text-white">{def.name}</span>
                    <span className="font-mono text-[10px] text-neutral-400">{def.health} HP</span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-neutral-400">{def.blurb}</p>
                  <div className="mt-3 grid grid-cols-3 gap-2 font-mono text-[9px] text-neutral-500">
                    <span>SPD {Math.round(def.maxSpeed * 3.6)}</span>
                    <span>MASS {def.mass.toFixed(1)}</span>
                    <span>RAM {def.frontDamageMult.toFixed(1)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-white/10 p-4">
            <span className="font-display text-[9px] text-amber-200">Match length</span>
            <div className="mt-3 flex gap-2">
              {BEST_OF_OPTIONS.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={bestOf === value}
                  onClick={() => setBestOf(value)}
                  className={`rounded border px-3 py-2 font-display text-[8px] ${
                    bestOf === value
                      ? "border-amber-300 bg-amber-300/10 text-amber-200"
                      : "border-white/10 text-neutral-500 hover:border-white/30"
                  }`}
                >
                  Best of {value}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-white/10 p-4">
            <span className="font-display text-[9px] text-red-200">Bot pressure</span>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {BOT_DIFFICULTIES.map((difficulty) => (
                <button
                  key={difficulty.id}
                  type="button"
                  title={difficulty.copy}
                  aria-pressed={botDifficulty === difficulty.id}
                  onClick={() => setBotDifficulty(difficulty.id)}
                  className={`rounded border px-2 py-2 font-display text-[7px] ${
                    botDifficulty === difficulty.id
                      ? "border-red-300 bg-red-300/10 text-red-200"
                      : "border-white/10 text-neutral-500 hover:border-white/30"
                  }`}
                >
                  {difficulty.name}
                </button>
              ))}
            </div>
            <span className="mt-2 block text-[10px] text-neutral-600">
              {BOT_DIFFICULTIES.find((difficulty) => difficulty.id === botDifficulty)?.copy}
            </span>
          </div>
        </div>

        <label className="mt-5 flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-cyan-400/20 bg-cyan-400/[0.04] p-4">
          <span>
            <span className="block font-display text-[9px] text-cyan-200">Host rule · Nitro</span>
            <span className="mt-1 block text-xs text-neutral-500">
              Hold Shift for a short rechargeable speed burst.
            </span>
          </span>
          <input
            type="checkbox"
            checked={nitroEnabled}
            onChange={(event) => setNitroEnabled(event.currentTarget.checked)}
            className="h-5 w-5 accent-cyan-400"
          />
        </label>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-5">
          <p className="max-w-xl text-xs leading-relaxed text-neutral-500">
            Front and rear bumpers deal damage. Speed and clean alignment matter; side scrapes only shove.
            Three bots use the same controls and physics as you.
          </p>
          <button type="button" onClick={start} className="arcade-btn shrink-0">
            ▶ Enter the pit
          </button>
        </div>
      </div>
    );
  }

  const localWon = finalWorld?.winnerId === driverRef.current?.localId;
  const winnerName = finalWorld?.winnerId
    ? driverRef.current?.getMeta(finalWorld.winnerId).name ?? "Unknown driver"
    : "Nobody";
  const roundWinnerName = hud.roundWinnerId
    ? driverRef.current?.getMeta(hud.roundWinnerId).name ?? "Unknown driver"
    : null;
  const scoreRows = Object.entries(hud.roundWins)
    .map(([id, wins]) => ({ id, wins, name: driverRef.current?.getMeta(id).name ?? id }))
    .sort((a, b) => b.wins - a.wins || a.name.localeCompare(b.name));
  const winsNeeded = Math.floor(hud.bestOf / 2) + 1;
  const healthFraction = Math.max(0, Math.min(1, hud.health / Math.max(1, hud.maxHealth)));

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        ref={frameRef}
        tabIndex={0}
        aria-label="Road Madness game. Use WASD or arrow keys to drive, Space to handbrake, and Shift for nitro."
        className="relative w-full overflow-hidden rounded-xl bg-[#130f12] outline-none focus:ring-2 focus:ring-amber-300/60"
        // 1.4× native matches Arena's on-screen px/metre so the game is the same page size
        style={{ maxWidth: ROAD_WIDTH * 1.4, aspectRatio: `${ROAD_WIDTH} / ${ROAD_HEIGHT}` }}
      >
        <div ref={hostRef} className="road-madness-canvas-tilt absolute inset-0" />

        <div className="pointer-events-none absolute inset-0 font-mono text-white">
          <div className="absolute left-3 top-3 min-w-40 rounded-md border border-white/15 bg-black/55 p-2.5 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-3 text-[10px] font-bold">
              <span>{hud.status !== "alive" ? "WRECKED" : `${VEHICLES[vehicle].name.toUpperCase()} · YOU`}</span>
              <span>{Math.ceil(hud.health)} HP</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded bg-white/10">
              <div
                className={`h-full transition-[width] ${
                  healthFraction > 0.55 ? "bg-emerald-400" : healthFraction > 0.25 ? "bg-amber-400" : "bg-red-500"
                }`}
                style={{ width: `${healthFraction * 100}%` }}
              />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className={`text-[8px] ${hud.boosting ? "text-cyan-200" : "text-neutral-500"}`}>
                {hud.boosting ? "NITRO" : "BOOST"}
              </span>
              <div className="h-1.5 flex-1 overflow-hidden rounded bg-white/10">
                <div
                  className={`h-full transition-[width] ${hud.boosting ? "bg-cyan-200 shadow-[0_0_8px_#67e8f9]" : "bg-cyan-500"}`}
                  style={{ width: `${Math.max(0, Math.min(1, hud.nitro)) * 100}%` }}
                />
              </div>
            </div>
          </div>

          <div className="absolute right-3 top-3 rounded-md border border-white/15 bg-black/55 p-2.5 text-right backdrop-blur-sm">
            <div className="text-lg font-black text-amber-300">{Math.round(hud.speed * 3.6)}</div>
            <div className="text-[8px] text-neutral-400">KM/H</div>
            <div className="mt-1 text-[9px]">{hud.alive}/{hud.total} RUNNING</div>
            <div className="mt-1 text-[8px] text-amber-200">ROUND {hud.roundNumber} · FIRST TO {winsNeeded}</div>
          </div>

          <div className="absolute bottom-3 left-3 rounded border border-white/10 bg-black/45 px-2 py-1 text-[9px] text-neutral-300">
            DAMAGE {Math.round(hud.damageDealt)}
          </div>
          <div className="absolute bottom-3 right-3 rounded border border-white/10 bg-black/45 px-2 py-1 text-[9px] text-neutral-300">
            {formatTime(hud.elapsed)}
          </div>

          {hud.status !== "alive" && !finalWorld && hud.phase === "playing" && (
            <div className="absolute inset-x-0 top-16 text-center font-display text-xs text-red-400">
              Wrecked · spectating the finish
            </div>
          )}

          {hud.suddenDeath && hud.phase === "playing" && (
            <div className="absolute inset-x-0 top-3 text-center font-display text-[10px] text-red-300">
              Sudden death · walls closing · impacts ×{hud.damageMultiplier.toFixed(1)}
            </div>
          )}

          {hud.phase === "round-ended" && !finalWorld && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/65 p-5 text-center backdrop-blur-sm">
              <span className="font-display text-[9px] uppercase tracking-[0.2em] text-amber-300">
                Round {hud.roundNumber} complete
              </span>
              <strong className="font-display text-lg text-white">
                {roundWinnerName ? `${roundWinnerName} takes the round` : "Double wreck · round draw"}
              </strong>
              <span className="text-xs text-neutral-400">
                {hud.roundEndReason === "timeout" ? "Won on health, then damage dealt" : `Next round in ${hud.roundBreak}`}
              </span>
              <div className="flex flex-wrap justify-center gap-2">
                {scoreRows.map((entry) => (
                  <span key={entry.id} className="rounded border border-white/15 bg-black/40 px-2 py-1 text-[9px]">
                    {entry.name} {entry.wins}/{winsNeeded}
                  </span>
                ))}
              </div>
            </div>
          )}

          {hud.countdown > 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/25">
              <span className="neon font-display text-6xl text-amber-300">{hud.countdown}</span>
            </div>
          )}
        </div>

        {finalWorld && (
          <Overlay>
            <p className="font-display text-[9px] uppercase tracking-[0.25em] text-amber-300">Pit closed</p>
            <h2 className={`font-display text-xl sm:text-2xl ${localWon ? "text-emerald-300" : "text-red-300"}`}>
              {localWon ? "You are the last madman" : `${winnerName} owns the wreckage`}
            </h2>
            <p className="font-mono text-xs text-neutral-300">
              {Math.round(hud.damageDealt)} damage · {formatTime(hud.matchElapsed)} match time
            </p>
            <div className="flex flex-wrap justify-center gap-2 font-mono text-[10px] text-neutral-300">
              {scoreRows.map((entry) => (
                <span key={entry.id} className="rounded border border-white/15 px-2 py-1">
                  {entry.name} {entry.wins}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <button type="button" onClick={start} className="arcade-btn">Rematch</button>
              <button type="button" onClick={garage} className="arcade-btn arcade-btn-ghost">Garage</button>
            </div>
          </Overlay>
        )}
      </div>

      <p className="text-center text-xs text-neutral-500">
        WASD / arrows drive · S brakes, then reverses · Space handbrake · Shift nitro · clean bumper hits hurt
      </p>
    </div>
  );
}

function formatTime(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

function Overlay({ children }: { children: ReactNode }) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-[#09090b]/80 p-5 text-center text-white backdrop-blur-sm">
      {children}
    </div>
  );
}
