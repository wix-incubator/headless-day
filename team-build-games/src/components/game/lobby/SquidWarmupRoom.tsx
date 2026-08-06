// src/components/game/lobby/SquidWarmupRoom.tsx
import { useState } from "react";
import { SQUID_PALETTE } from "../../../game/squid/render/palette";
import type { LobbyPlayer } from "../../../game/net/lobby";
import type { PlayerId } from "../../../game/arena/types";
import { STAGES } from "../../../game/squid/stage";
import type { StageId } from "../../../game/squid/stage";
import { MAX_PLAYERS } from "../../../game/constants";
import { formatTimeMs, type ScoreEntry } from "../../../lib/squid/scores";
import CoinSlot from "./CoinSlot";

const hex = (i: number) => `#${(SQUID_PALETTE[i % SQUID_PALETTE.length] ?? 0).toString(16).padStart(6, "0")}`;

interface Props {
  roster: LobbyPlayer[];
  localId: PlayerId;
  hostId: PlayerId | null;
  isHost: boolean;
  name: string;
  colorIndex: number;
  stage: StageId;
  joinUrl: string;
  /** Per-stage top-10; null while loading; missing entries render an empty state. */
  scores: Partial<Record<StageId, ScoreEntry[]>> | null;
  onName: (n: string) => void;
  onColor: (i: number) => void;
  onStage: (s: StageId) => void;
  onStart: () => void;
  /** Synced coin-insert flag — every player in the room sees the drop animation. */
  starting: boolean;
  onKick: (id: PlayerId) => void;
}

export default function SquidWarmupRoom(props: Props) {
  const [copied, setCopied] = useState(false);
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
    <div className="grid w-full gap-6 sm:grid-cols-[1fr_300px]">
      {/* left: setup */}
      <div className="flex flex-col gap-5">
        <div>
          <h2 className="text-3xl font-bold">Squid — waiting room</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            One octopus, eight legs. Grab a leg, walk together, beat the clock.
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

        <div className="flex flex-col gap-1 text-sm">
          <span className="text-neutral-500">Your leg color</span>
          <div className="flex flex-wrap gap-2">
            {SQUID_PALETTE.map((_, i) => (
              <button
                key={i}
                aria-label={`color ${i + 1}`}
                onClick={() => props.onColor(i)}
                style={{ background: hex(i) }}
                className={`h-8 w-8 rounded-full transition ${
                  i === props.colorIndex ? "ring-2 ring-offset-2 ring-black dark:ring-white" : "opacity-80"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1 text-sm">
          <span className="text-neutral-500">Stage {props.isHost ? "(you pick)" : "(host picks)"}</span>
          <div className="flex flex-wrap gap-2">
            {STAGES.map((s) => (
              <button
                key={s.id}
                disabled={!props.isHost}
                onClick={() => props.onStage(s.id)}
                className={`rounded-md border px-3 py-1.5 font-medium transition ${
                  s.id === props.stage
                    ? "border-black bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
                    : "border-neutral-300 text-neutral-600 hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                }`}
              >
                {s.name}
                {s.hole && <span className="ml-1 text-xs opacity-70">· hole!</span>}
              </button>
            ))}
          </div>
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
            <button onClick={copy} className="rounded-md bg-neutral-800 px-3 py-1.5 text-sm text-white hover:bg-neutral-700">
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        <div className="mt-2">
          <CoinSlot
            onInsert={props.onStart}
            disabled={!props.isHost}
            inserting={props.starting}
            hint={props.isHost ? undefined : "The host inserts the coin"}
          />
        </div>
      </div>

      {/* right: party + highscores */}
      <div className="flex flex-col gap-4">
        <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Party · {props.roster.length}/{MAX_PLAYERS}
          </h3>
          <ul className="flex flex-col gap-2">
            {props.roster.map((p) => (
              <li key={p.id} className="flex items-center gap-2">
                <span className="h-4 w-4 shrink-0 rounded-full" style={{ background: hex(p.iconColor ?? 0) }} />
                <span className="flex-1 truncate text-sm">
                  {p.name}
                  {p.id === props.localId && " (you)"}
                  {p.id === props.hostId && <span className="ml-1 text-xs text-amber-500">host</span>}
                </span>
                {props.isHost && p.id !== props.localId && (
                  <button onClick={() => props.onKick(p.id)} className="rounded px-2 py-0.5 text-xs text-red-500 hover:bg-red-500/10">
                    kick
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>

        {STAGES.map((s) => (
          <div key={s.id} className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              🏆 {s.name} — best times
            </h3>
            {props.scores === null ? (
              <p className="text-xs text-neutral-500">Loading…</p>
            ) : (props.scores[s.id] ?? []).length === 0 ? (
              <p className="text-xs text-neutral-500">No finishes yet — be the first team!</p>
            ) : (
              <ol className="flex flex-col gap-1 text-sm">
                {(props.scores[s.id] ?? []).map((sc, i) => (
                  <li key={`${sc.at}-${i}`} className="flex items-baseline gap-2">
                    <span className="w-5 shrink-0 text-right text-xs text-neutral-500">{i + 1}.</span>
                    <span className="font-mono font-semibold">{formatTimeMs(sc.timeMs)}</span>
                    <span className="truncate text-xs text-neutral-500">{sc.names}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
