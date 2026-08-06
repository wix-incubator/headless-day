import { useState } from "react";
import type { PlayerId } from "../../../game/overrun/types";
import { MAX_OVERRUN_PLAYERS } from "../../../game/overrun/constants";
import type { GunId } from "../../../game/overrun/types";
import OverrunReadyRoom from "./OverrunReadyRoom";
import CoinSlot from "../lobby/CoinSlot";

/**
 * Overrun's warm-up room. Leaner than Arena's: no shape/weapon/avatar/bots/rounds —
 * this game has no cosmetic picker (colorIndex is derived at match start from oStart
 * order, never chosen here). Party rows use a neutral index-in-roster color preview.
 */

interface RosterEntry {
  id: PlayerId;
  name: string;
}

interface Props {
  roster: RosterEntry[];
  localId: PlayerId;
  hostId: PlayerId | null;
  isHost: boolean;
  name: string;
  joinUrl: string;
  /** Campaign = finite staged run w/ intro comic; Survival = today's endless run. */
  mode: "campaign" | "survival";
  onMode: (mode: "campaign" | "survival") => void;
  onName: (n: string) => void;
  onStart: (mode: "campaign" | "survival") => void;
  /** Synced coin-insert flag — every player in the room sees the drop animation. */
  starting: boolean;
  onKick: (id: PlayerId) => void;
  onMakeHost: (id: PlayerId) => void;
  soldierAssetUrl?: string;
  weaponAssetUrls?: Partial<Record<GunId, string>>;
}

export default function OverrunWarmupRoom(props: Props) {
  const [copied, setCopied] = useState(false);
  const canStart = props.roster.length >= 1 && props.roster.length <= MAX_OVERRUN_PLAYERS;

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
    <div className="w-full overflow-hidden rounded-xl border border-red-400/20 bg-[#0b100c] shadow-[0_0_40px_rgb(239_68_68/0.08)]">
      <OverrunReadyRoom
        roster={props.roster}
        localId={props.localId}
        hostId={props.hostId}
        isHost={props.isHost}
        onKick={props.onKick}
        onMakeHost={props.onMakeHost}
        soldierAssetUrl={props.soldierAssetUrl}
        weaponAssetUrls={props.weaponAssetUrls}
      />
      <div className="p-4 sm:p-5">
        <div className="flex flex-col gap-5">
          <div>
            <p className="font-display text-[8px] text-red-300">Mission staging</p>
            <h2 className="mt-2 text-2xl font-bold text-stone-100">Final equipment check</h2>
            <p className="text-sm text-emerald-100/50">
              Share the squad frequency, check your kit, then deploy together.
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
          <span className="text-neutral-500">Invite link</span>
          <div className="flex gap-2">
            <input
              readOnly
              value={props.joinUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="w-full max-w-sm rounded-md border border-neutral-300 bg-neutral-50 px-3 py-1.5 font-mono text-xs dark:border-neutral-700 dark:bg-neutral-900"
            />
            <button onClick={copy} className="rounded-md bg-neutral-800 px-3 py-1.5 text-sm text-white hover:bg-neutral-700">
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          WASD move · mouse aim · hold LMB fire · R reload · 1/2/3 perks
        </p>

        <div className="mt-2 flex flex-col gap-2">
          <span className="font-display text-[7px] text-emerald-300/70">
            Squad staged above · {props.roster.length}/{MAX_OVERRUN_PLAYERS}
          </span>
          {props.isHost ? (
            <div className="flex gap-2" role="group" aria-label="Game mode">
              {(["campaign", "survival"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => props.onMode(m)}
                  aria-pressed={props.mode === m}
                  className={`rounded-md border px-3 py-2 font-display text-[9px] uppercase transition ${
                    props.mode === m
                      ? "border-red-400/70 bg-red-500/10 text-red-300"
                      : "border-white/15 text-neutral-400 hover:border-white/40"
                  }`}
                >
                  {m === "campaign" ? "Campaign" : "Survival"}
                </button>
              ))}
            </div>
          ) : (
            <span className="font-display text-[7px] text-neutral-500">
              Mode · {props.mode === "campaign" ? "Campaign" : "Survival"}
            </span>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <CoinSlot
              onInsert={() => props.onStart(props.mode)}
              disabled={!props.isHost || !canStart}
              inserting={props.starting}
              hint={props.isHost ? undefined : "The host inserts the coin"}
            />
          </div>
          {props.isHost && props.roster.length > MAX_OVERRUN_PLAYERS && (
            <span className="text-xs text-red-500">Too many players — the mesh caps at 8</span>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
