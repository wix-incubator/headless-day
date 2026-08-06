import { useEffect, useRef, useState } from "react";
import type { LobbyPlayer } from "../../../game/net/lobby";
import type { PlayerId } from "../../../game/arena/types";
import {
  PREMIUM_SKINS,
  SHAPES,
  isPremiumShape,
  ownsShape,
  type Shape,
} from "../../../game/arena/cosmetic";
import {
  WEAPON_INFO,
  WEAPON_LIST,
  isPremiumWeapon,
  ownsWeapon,
  type Weapon,
} from "../../../game/arena/weapons";
import { MAX_PLAYERS } from "../../../game/constants";
import AvatarUploader from "../../members/AvatarUploader";
import { MODES, modeInfo, type GameMode } from "../../../game/arena/modes";
import ArenaReadyRoom from "./ArenaReadyRoom";
import CoinSlot from "./CoinSlot";

const FIGHTER: Record<Shape, { label: string; src: string }> = {
  circle: { label: "Swordsman", src: "/assets/arena/warriors/swordsman.png" },
  square: { label: "Spearman", src: "/assets/arena/warriors/spearman.png" },
  triangle: {
    label: "Knife fighter",
    src: "/assets/arena/warriors/knife-fighter.png",
  },
  diamond: { label: "Archer", src: "/assets/arena/warriors/archer.png" },
  "neon-ronin": {
    label: "Neon Ronin",
    src: "/assets/arena/skins/neon-ronin.png",
  },
  "solar-warden": {
    label: "Solar Warden",
    src: "/assets/arena/skins/solar-warden.png",
  },
};

interface Props {
  roster: LobbyPlayer[];
  localId: PlayerId;
  hostId: PlayerId | null;
  isHost: boolean;
  name: string;
  shape: Shape;
  weapon: Weapon;
  mode: GameMode;
  joinUrl: string;
  onName: (n: string) => void;
  onShape: (s: Shape) => void;
  onWeapon: (w: Weapon) => void;
  onUnlockSkin: (s: Shape) => void;
  onAvatar: (url: string | null) => void;
  onMode: (mode: GameMode) => void;
  onStart: (botCount: number, rounds: number, mode: GameMode) => void;
  /** Synced coin-insert flag — every player in the room sees the drop animation. */
  starting: boolean;
  onKick: (id: PlayerId) => void;
  onMakeHost: (id: PlayerId) => void;
  /** Signed-in members can set a per-game face photo; anonymous players see a locked hint. */
  isMember: boolean;
  avatarUrl: string | null;
  ownedPremiumShapes: Shape[];
}

// Bots collapse into named stakes; a fine-tune stepper handles anything in between.
const DIFFICULTY_PRESETS: { key: string; label: string; bots: number; tint: string }[] = [
  { key: "chill", label: "CHILL", bots: 1, tint: "border-emerald-400/60 bg-emerald-400/10 text-emerald-300" },
  { key: "skirmish", label: "SKIRMISH", bots: 3, tint: "border-cyan-400/60 bg-cyan-400/10 text-cyan-300" },
  { key: "mayhem", label: "MAYHEM", bots: 6, tint: "border-fuchsia-400/60 bg-fuchsia-400/10 text-fuchsia-300" },
];
// Best-of tokens instead of a dropdown.
const ROUND_TOKENS: { rounds: number; label: string }[] = [
  { rounds: 1, label: "SINGLE" },
  { rounds: 3, label: "BO3" },
  { rounds: 5, label: "BO5" },
  { rounds: 7, label: "BO7" },
];

export default function WarmupRoom(props: Props) {
  const [bots, setBots] = useState(2);
  const [rounds, setRounds] = useState(1);
  const [copied, setCopied] = useState(false);

  // Versus needs ≥2 participants (humans + host-driven bots); Coop Survival is a co-op PvE run that
  // one player can start solo (allies vs the horde — no bots).
  const selectedMode = modeInfo(props.mode);
  const isSurvival = selectedMode.rules === "survival";
  const maxBots = Math.max(0, MAX_PLAYERS - props.roster.length);
  const canStart =
    selectedMode.available &&
    (isSurvival ? props.roster.length >= 1 : props.roster.length + bots >= 2);
  const selectedPremiumSkin = PREMIUM_SKINS.find(
    (skin) => skin.id === props.shape,
  );
  const selectedSkinOwned = ownsShape(props.shape, props.ownedPremiumShapes);
  const selectedWeaponInfo = WEAPON_INFO[props.weapon];
  const selectedWeaponSkin = selectedWeaponInfo.premiumShape
    ? PREMIUM_SKINS.find((skin) => skin.id === selectedWeaponInfo.premiumShape)
    : undefined;
  const selectedWeaponOwned = ownsWeapon(props.weapon, props.ownedPremiumShapes);

  // Fill an empty room with 2 bots, then clear them the moment another player joins.
  const wasAlone = useRef(props.roster.length <= 1);
  useEffect(() => {
    const alone = props.roster.length <= 1;
    if (wasAlone.current && !alone) setBots(0);
    wasAlone.current = alone;
  }, [props.roster.length]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(props.joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — the input is selectable as a fallback */
    }
  };

  return (
    <div className="arena-waiting-room w-full overflow-hidden rounded-xl border border-amber-300/20 bg-[#0d0a08] shadow-[0_0_40px_rgb(245_158_11/0.08)]">
      <ArenaReadyRoom
        roster={props.roster}
        localId={props.localId}
        hostId={props.hostId}
        isHost={props.isHost}
        shape={props.shape}
        weapon={props.weapon}
        onKick={props.onKick}
        onMakeHost={props.onMakeHost}
      />
      <div className="arena-waiting-controls p-4 sm:p-5">
        {/* left: setup */}
        <div className="flex flex-col gap-5">
          <div>
            <p className="font-display text-[8px] text-amber-300">
              Gladiator preparations
            </p>
            <h2 className="mt-2 text-2xl font-bold text-stone-100">
              Choose your warrior
            </h2>
            <p className="text-sm text-stone-500">
              Ready your weapon beneath the colosseum. The host opens the battle
              gate.
            </p>
          </div>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-neutral-500">Your name</span>
            <input
              value={props.name}
              onChange={(e) => props.onName(e.target.value.slice(0, 16))}
              className="w-56 rounded-md border border-neutral-300 bg-white px-3 py-1.5 dark:border-neutral-700 dark:bg-neutral-900"
              placeholder="Player"
            />
          </label>

          <div className="flex flex-col gap-2 text-sm">
            <span className="text-neutral-500">Game mode</span>
            <div className="grid gap-2 sm:grid-cols-2">
              {MODES.map((entry) => {
                const selected = entry.id === props.mode;
                const status = entry.available
                  ? "Live"
                  : entry.id === "coop-survival"
                    ? "In development"
                    : "Future";
                return (
                  <button
                    key={entry.id}
                    type="button"
                    disabled={!props.isHost || !entry.available}
                    onClick={() => props.onMode(entry.id)}
                    aria-pressed={selected}
                    className={`min-h-16 rounded-md border px-3 py-2 text-left transition ${
                      selected
                        ? "border-cyan-400 bg-cyan-400/10"
                        : "border-neutral-300 dark:border-neutral-700"
                    } ${!props.isHost || !entry.available ? "cursor-not-allowed opacity-55" : "hover:bg-neutral-100 dark:hover:bg-neutral-800"}`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                        {entry.name}
                      </span>
                      <span className="text-[10px] uppercase text-neutral-500">
                        {status}
                      </span>
                    </span>
                    <span className="mt-1 block text-xs text-neutral-500">
                      {entry.blurb}
                    </span>
                  </button>
                );
              })}
            </div>
            {!props.isHost && (
              <span className="text-xs text-neutral-500">
                The host chooses the mode.
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1 text-sm">
            <span className="text-neutral-500">Your fighter</span>
            <div className="flex flex-wrap gap-2">
              {SHAPES.map((s) => (
                <div key={s} className="relative">
                  <button
                    aria-label={FIGHTER[s].label}
                    title={FIGHTER[s].label}
                    onClick={() => props.onShape(s)}
                    className={`flex h-14 w-14 items-center justify-center overflow-hidden rounded-md border p-1 transition ${
                      s === props.shape
                        ? "border-black bg-neutral-200 ring-2 ring-black dark:border-white dark:bg-neutral-800 dark:ring-white"
                        : "border-neutral-300 bg-neutral-100 hover:bg-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800"
                    } ${isPremiumShape(s) ? "border-amber-300/60 bg-amber-300/10" : ""}`}
                  >
                    <img
                      src={FIGHTER[s].src}
                      alt=""
                      className="h-full w-full object-contain"
                    />
                  </button>
                  {isPremiumShape(s) &&
                    !ownsShape(s, props.ownedPremiumShapes) && (
                      <span className="pointer-events-none absolute -right-1 -top-1 rounded bg-neutral-950 px-1 text-[10px] leading-4 text-amber-200">
                        $
                      </span>
                    )}
                </div>
              ))}
            </div>
            {selectedPremiumSkin && (
              <div className="mt-3 grid gap-3 rounded-lg border border-amber-300/30 bg-amber-300/10 p-3 sm:grid-cols-[84px_1fr]">
                <img
                  src={selectedPremiumSkin.preview}
                  alt=""
                  className="h-24 w-20 rounded-md border border-amber-200/20 object-cover"
                />
                <div className="flex flex-col gap-2">
                  <span className="font-display text-[9px] text-amber-200">
                    Premium skin · $2
                  </span>
                  <strong className="font-display text-sm text-stone-100">
                    {selectedPremiumSkin.name}
                  </strong>
                  <span className="text-xs text-stone-400">
                    {selectedPremiumSkin.blurb}
                  </span>
                  {selectedSkinOwned ? (
                    <span className="w-fit rounded border border-emerald-300/30 px-2 py-1 text-xs text-emerald-200">
                      Unlocked
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => props.onUnlockSkin(selectedPremiumSkin.id)}
                      className="w-fit rounded-md bg-amber-300 px-3 py-1.5 text-xs font-semibold text-neutral-950 hover:bg-amber-200"
                    >
                      {props.isMember ? "Unlock skin" : "Sign in to unlock"}
                    </button>
                  )}
                  {!selectedSkinOwned && (
                    <span className="text-[11px] text-stone-500">
                      If the match starts before unlock, Arena assigns you a
                      random free fighter.
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1 text-sm">
            <span className="text-neutral-500">Your face photo</span>
            {props.isMember ? (
              <AvatarUploader
                gameId="arena"
                currentUrl={props.avatarUrl}
                allowRemove
                reloadAfterChange={false}
                onChange={props.onAvatar}
              />
            ) : (
              <div className="flex items-center gap-2 rounded-md border border-neutral-300 px-3 py-2 text-xs text-neutral-500 dark:border-neutral-700">
                <span aria-hidden>🔒</span>
                <span>Sign in to place your photo on your fighter.</span>
                <a
                  href={`/api/auth/login?returnToUrl=${encodeURIComponent(
                    typeof window !== "undefined"
                      ? window.location.pathname + window.location.search
                      : "/games/arena",
                  )}`}
                  data-astro-reload
                  data-astro-prefetch="false"
                  className="ml-auto shrink-0 rounded bg-sky-500 px-2 py-1 font-semibold text-white hover:bg-sky-400"
                >
                  Sign in
                </a>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1 text-sm">
            <span className="text-neutral-500">Your weapon</span>
            <div className="flex flex-wrap gap-2">
              {WEAPON_LIST.map((w) => {
                const info = WEAPON_INFO[w];
                const owned = ownsWeapon(w, props.ownedPremiumShapes);
                return (
                  <button
                    key={w}
                    type="button"
                    aria-label={info.label}
                    title={`${info.label}: ${info.blurb}`}
                    onClick={() => props.onWeapon(w)}
                    className={`relative flex h-14 min-w-20 items-center gap-2 rounded-md border px-2 py-1 font-medium transition ${
                      w === props.weapon
                        ? "border-cyan-300 bg-neutral-900 text-white ring-1 ring-cyan-300 dark:bg-white dark:text-neutral-900"
                        : "border-neutral-300 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                    } ${isPremiumWeapon(w) ? "border-amber-300/60 bg-amber-300/10" : ""}`}
                  >
                    <img src={info.asset} alt="" className="h-9 w-14 object-contain" />
                    <span className="max-w-20 text-left text-xs leading-tight">{info.label}</span>
                    {isPremiumWeapon(w) && !owned && (
                      <span className="absolute -right-1 -top-1 rounded bg-neutral-950 px-1 text-[10px] leading-4 text-amber-200">$</span>
                    )}
                  </button>
                );
              })}
            </div>
            {selectedWeaponSkin && (
              <div className="mt-3 grid gap-3 rounded-lg border border-amber-300/30 bg-amber-300/10 p-3 sm:grid-cols-[108px_1fr]">
                <img
                  src={selectedWeaponInfo.asset}
                  alt=""
                  className="h-20 w-24 object-contain"
                />
                <div className="flex flex-col gap-2">
                  <span className="font-display text-[9px] text-amber-200">Premium weapon</span>
                  <strong className="font-display text-sm text-stone-100">{selectedWeaponInfo.label}</strong>
                  <span className="text-xs text-stone-400">{selectedWeaponInfo.blurb}</span>
                  {selectedWeaponOwned ? (
                    <span className="w-fit rounded border border-emerald-300/30 px-2 py-1 text-xs text-emerald-200">Unlocked with {selectedWeaponSkin.name}</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => props.onUnlockSkin(selectedWeaponSkin.id)}
                      className="w-fit rounded-md bg-amber-300 px-3 py-1.5 text-xs font-semibold text-neutral-950 hover:bg-amber-200"
                    >
                      {props.isMember ? `Unlock ${selectedWeaponSkin.name} set` : "Sign in to unlock"}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 text-sm">
            <span className="text-neutral-500">Invite link</span>
            <div className="flex gap-2">
              <input
                readOnly
                value={props.joinUrl}
                onFocus={(e) => e.currentTarget.select()}
                className="w-full max-w-sm rounded-md border border-neutral-300 bg-neutral-50 px-3 py-1.5 font-mono text-xs dark:border-neutral-700 dark:bg-neutral-900"
              />
              <button
                onClick={copy}
                className="rounded-md bg-neutral-800 px-3 py-1.5 text-sm text-white hover:bg-neutral-700"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>

          <div className="mt-2 flex flex-col gap-2">
            <span className="font-display text-[7px] text-amber-300/70">
              Party assembled above · {props.roster.length}/{MAX_PLAYERS}
            </span>
            {props.isHost ? (
              <div className="flex flex-col gap-4">
                {isSurvival ? (
                  <div className="border-l-2 border-emerald-400/50 py-1 pl-3">
                    <span className="font-display text-[8px] text-emerald-300">Coop campaign</span>
                    <p className="mt-1 text-xs text-neutral-400">
                      {props.roster.length} {props.roster.length === 1 ? "ally" : "allies"} against escalating creature waves.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Difficulty — named stakes set the bot count; stepper fine-tunes. */}
                    <div className="flex flex-col gap-2">
                      <span className="font-display text-[7px] text-neutral-500">
                        Difficulty · {bots} {bots === 1 ? "bot" : "bots"}
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        {DIFFICULTY_PRESETS.map((p) => {
                          const target = Math.min(p.bots, maxBots);
                          const active = bots === target;
                          return (
                            <button
                              key={p.key}
                              onClick={() => setBots(target)}
                              aria-pressed={active}
                              className={`rounded-md border px-3 py-2 font-display text-[9px] transition ${
                                active ? p.tint : "border-white/15 text-neutral-400 hover:border-white/40"
                              }`}
                            >
                              {p.label}
                            </button>
                          );
                        })}
                        <div className="flex items-center gap-1 rounded-md border border-white/15 px-1">
                          <button
                            onClick={() => setBots(Math.max(0, bots - 1))}
                            aria-label="Fewer bots"
                            className="px-2 py-1 font-display text-[10px] text-neutral-400 hover:text-cyan-300"
                          >
                            −
                          </button>
                          <span className="w-5 text-center font-display text-[10px] tabular-nums text-neutral-200">
                            {bots}
                          </span>
                          <button
                            onClick={() => setBots(Math.min(maxBots, bots + 1))}
                            aria-label="More bots"
                            className="px-2 py-1 font-display text-[10px] text-neutral-400 hover:text-cyan-300"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Rounds — best-of tokens. */}
                    <div className="flex flex-col gap-2">
                      <span className="font-display text-[7px] text-neutral-500">Rounds</span>
                      <div className="flex flex-wrap gap-2">
                        {ROUND_TOKENS.map((t) => {
                          const active = rounds === t.rounds;
                          return (
                            <button
                              key={t.rounds}
                              onClick={() => setRounds(t.rounds)}
                              aria-pressed={active}
                              className={`rounded-md border px-3 py-2 font-display text-[9px] transition ${
                                active
                                  ? "border-amber-300/60 bg-amber-300/10 text-amber-200"
                                  : "border-white/15 text-neutral-400 hover:border-white/40"
                              }`}
                            >
                              {t.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                <CoinSlot
                  onInsert={() => props.onStart(isSurvival ? 0 : bots, isSurvival ? 1 : rounds, props.mode)}
                  disabled={!canStart}
                  inserting={props.starting}
                  hint={
                    !canStart
                      ? isSurvival
                        ? "Need at least one ally"
                        : "Need 2+ fighters — add bots or share the invite link"
                      : undefined
                  }
                />
              </div>
            ) : (
              <CoinSlot
                onInsert={() => {}}
                disabled
                inserting={props.starting}
                hint="The host inserts the coin"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
