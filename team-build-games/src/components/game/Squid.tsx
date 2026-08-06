// src/components/game/Squid.tsx
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Phaser from "phaser";
import { SQUID_H, SQUID_W, SquidScene } from "../../game/squid/render/scene";
import type { SquidConfig, SquidEvent, SquidHudState } from "../../game/squid/render/contract";
import { SquidSession } from "../../game/squid/net/session";
import { buildJoinUrl, mintRoomId, parseRoomId } from "../../game/net/roomLink";
import { buildIceServers, iceConfigFromEnv } from "../../game/net/ice";
import { joinedIds } from "../../game/net/lobby";
import { Sfx } from "../../game/audio/sfx";
import { STAGES, nextStageId } from "../../game/squid/stage";
import type { StageId } from "../../game/squid/stage";
import { formatTimeMs, type ScoreEntry } from "../../lib/squid/scores";
import SquidWarmupRoom from "./lobby/SquidWarmupRoom";
import { COIN_INSERT_MS } from "./lobby/CoinSlot";
import Countdown from "./hud/Countdown";

const ICE_SERVERS: RTCIceServer[] = buildIceServers(
  iceConfigFromEnv({
    PUBLIC_STUN_URLS: import.meta.env.PUBLIC_STUN_URLS,
    PUBLIC_TURN_URLS: import.meta.env.PUBLIC_TURN_URLS,
    PUBLIC_TURN_URL: import.meta.env.PUBLIC_TURN_URL,
    PUBLIC_TURN_USERNAME: import.meta.env.PUBLIC_TURN_USERNAME,
    PUBLIC_TURN_CREDENTIAL: import.meta.env.PUBLIC_TURN_CREDENTIAL,
  }),
);
const FRESH_HUD: SquidHudState = { countdown: 3, timeMs: 0, myLeg: null, result: null };

/** Squid island: waiting room (stage select + highscores) → countdown → co-op round → result. */
export default function Squid() {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sfxRef = useRef<Sfx>(new Sfx());
  const sessionRef = useRef<SquidSession | null>(null);
  const nameRef = useRef("Player");
  const colorRef = useRef(0);
  const postedEpochRef = useRef(-1);

  const [, forceRender] = useState(0);
  const bump = useCallback(() => forceRender((n) => n + 1), []);
  const [ready, setReady] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [name, setName] = useState("Player");
  const [colorIndex, setColorIndex] = useState(0);
  const [stage, setStage] = useState<StageId>("stage1");
  const [hud, setHud] = useState<SquidHudState>(FRESH_HUD);
  const [result, setResult] = useState<{ result: "finished" | "failed"; timeMs: number; saved: boolean | null } | null>(null);
  const [scores, setScores] = useState<Partial<Record<StageId, ScoreEntry[]>> | null>(null);

  // --- create transport + session once (client only) ---
  useEffect(() => {
    let cancelled = false;
    let session: SquidSession | null = null;
    (async () => {
      const existing = parseRoomId(window.location.search);
      const id = existing ?? mintRoomId();
      if (!existing) {
        window.history.replaceState(null, "", buildJoinUrl(window.location.origin, window.location.pathname, id));
      }
      setRoomId(id);
      const { createRtcTransport } = await import("../../game/net/rtc"); // client-only (WebRTC)
      if (cancelled) return;
      const transport = createRtcTransport({ roomId: id, iceServers: ICE_SERVERS });
      session = new SquidSession({ transport, name: nameRef.current, iconColor: colorRef.current, isCreator: !existing, onChange: bump });
      sessionRef.current = session;
      setReady(true);
    })();
    return () => {
      cancelled = true;
      session?.leave();
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [bump]);

  // --- highscore dashboard: fetch on entry and whenever we land back in the lobby ---
  const sessionState = ready ? sessionRef.current!.getState() : null;
  const inLobby = !sessionState || sessionState.phase === "lobby";
  const refreshScores = useCallback(async () => {
    try {
      const entries = await Promise.all(
        STAGES.map(async (s) => {
          const r = await fetch(`/api/squid-scores?stage=${s.id}`);
          if (!r.ok) throw new Error(String(r.status));
          return [s.id, (await r.json()).scores as ScoreEntry[]] as const;
        }),
      );
      setScores(Object.fromEntries(entries));
    } catch {
      setScores({}); // dashboard shows empty states; the game stays playable
    }
  }, []);
  useEffect(() => {
    if (ready && inLobby) void refreshScores();
  }, [ready, inLobby, refreshScores]);

  const onHud = useCallback((h: SquidHudState) => setHud(h), []);
  const onEvent = useCallback((e: SquidEvent) => {
    const s = sfxRef.current;
    if (e.type === "tik") s.play("tik");
    else if (e.type === "go") s.play("go");
    else if (e.type === "grab") s.play("attack");
    else if (e.type === "finish") s.play("win");
    else if (e.type === "fall") s.play("gameover");
  }, []);

  // --- host reports a finished round once, then refreshes the dashboard ---
  const onEnd = useCallback(
    (res: "finished" | "failed", timeMs: number) => {
      setResult({ result: res, timeMs, saved: res === "finished" ? null : false });
      const session = sessionRef.current;
      if (!session) return;
      const state = session.getState();
      if (res !== "finished" || !state.isHost || postedEpochRef.current === state.matchEpoch) return;
      postedEpochRef.current = state.matchEpoch;
      const playerNames = state.playerIds.map((id) => session.getMeta(id).name.trim() || "Player");
      void fetch("/api/squid-result", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ stageId: state.stage, timeMs, playerNames }),
      })
        .then((r) => {
          setResult((cur) => (cur ? { ...cur, saved: r.ok } : cur));
          void refreshScores();
        })
        .catch(() => setResult((cur) => (cur ? { ...cur, saved: false } : cur)));
    },
    [refreshScores],
  );

  // --- (re)create the Phaser game whenever a round starts ---
  const inMatch = !!sessionState && sessionState.phase !== "lobby";
  const gameKey = inMatch ? `s${sessionState.matchEpoch}` : "";
  useEffect(() => {
    gameRef.current?.destroy(true);
    gameRef.current = null;
    const session = sessionRef.current;
    if (!gameKey || !session || !hostRef.current) return;

    setResult(null);
    setHud(FRESH_HUD);
    const cfg: SquidConfig = { driver: session, onHud, onEvent, onEnd };
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      width: SQUID_W,
      height: SQUID_H,
      parent: hostRef.current,
      backgroundColor: "#0f172a",
      scene: [SquidScene],
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_HORIZONTALLY },
      callbacks: { preBoot: (g) => g.registry.set("cfg", cfg) },
    });
    gameRef.current = game;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameKey, onEnd, onEvent, onHud]);

  // --- connect chime + audio unlock (arena parity) ---
  const rosterIds = sessionState ? sessionState.roster.map((pl) => pl.id) : [];
  const rosterKey = rosterIds.join(",");
  const prevRosterIdsRef = useRef<string[]>([]);
  useEffect(() => {
    if (!sessionState) return;
    const joined = joinedIds(prevRosterIdsRef.current, rosterIds, sessionState.localId);
    prevRosterIdsRef.current = rosterIds;
    if (joined.length > 0) sfxRef.current.play("join");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rosterKey]);
  useEffect(() => {
    const unlock = () => sfxRef.current.resume();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  if (!ready) {
    return <div className="py-16 text-center text-neutral-500">Connecting to the reef…</div>;
  }

  const joinUrl = buildJoinUrl(window.location.origin, window.location.pathname, roomId);

  const changeName = (n: string) => {
    setName(n);
    nameRef.current = n;
    sessionRef.current?.setProfile(n, colorRef.current);
  };
  const changeColor = (i: number) => {
    setColorIndex(i);
    colorRef.current = i;
    sessionRef.current?.setProfile(nameRef.current, i);
  };
  const startRound = (viaCoin = false) => {
    sfxRef.current.resume();
    const session = sessionRef.current;
    if (!session) return;
    if (viaCoin) {
      session.signalCoin();
      window.setTimeout(() => session.start(stage), COIN_INSERT_MS);
    } else {
      session.start(stage);
    }
  };
  const playAgain = () => {
    if (sessionState?.isHost) startRound();
  };
  const startNextLevel = () => {
    const state = sessionRef.current?.getState();
    if (!state?.isHost) return;
    const next = nextStageId(state.stage);
    if (!next) return;
    setStage(next); // keep the lobby selector + "Play again" in sync with what we're playing
    sfxRef.current.resume();
    sessionRef.current?.start(next);
  };
  const backToRoom = () => {
    sessionRef.current?.toLobby();
    setResult(null);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {!inMatch ? (
        <SquidWarmupRoom
          roster={sessionState!.roster}
          localId={sessionState!.localId}
          hostId={sessionState!.hostId}
          isHost={sessionState!.isHost}
          name={name}
          colorIndex={colorIndex}
          stage={stage}
          joinUrl={joinUrl}
          scores={scores}
          onName={changeName}
          onColor={changeColor}
          onStage={setStage}
          onStart={() => startRound(true)}
          starting={sessionState!.starting}
          onKick={(id) => sessionRef.current?.kick(id)}
        />
      ) : (
        <div style={{ position: "relative", width: "100%", maxWidth: SQUID_W, aspectRatio: `${SQUID_W} / ${SQUID_H}` }}>
          <div ref={hostRef} style={{ position: "absolute", inset: 0, borderRadius: 12, overflow: "hidden", background: "#0f172a" }} />

          <div style={{ position: "absolute", left: 12, top: 12, fontFamily: "monospace", fontSize: 22, fontWeight: 700, color: "#fff", pointerEvents: "none" }}>
            ⏱ {formatTimeMs(hud.timeMs)}
          </div>
          <div style={{ position: "absolute", right: 12, top: 12, fontSize: 13, color: "#94a3b8", pointerEvents: "none" }}>
            {hud.myLeg === null ? "Click a leg or press Space to grab one" : `Leg ${hud.myLeg + 1} — Space switches`}
          </div>

          {hud.countdown > 0 && <Countdown n={hud.countdown} />}

          {result && (
            <Overlay>
              {result.result === "finished" ? (
                <>
                  <h2 className="text-4xl font-bold">Finish! 🏁 {formatTimeMs(result.timeMs)}</h2>
                  {result.saved === null && sessionState!.isHost && <p className="text-sm text-neutral-300">Saving score…</p>}
                  {result.saved === false && sessionState!.isHost && (
                    <p className="text-sm text-amber-300">Couldn't save the score — the time still counts in your hearts.</p>
                  )}
                  {result.saved === true && sessionState!.isHost && <p className="text-sm text-emerald-300">Saved to the team highscores!</p>}
                </>
              ) : (
                <h2 className="text-4xl font-bold">The octopus fell! ☠️</h2>
              )}
              <div className="flex gap-3">
                {sessionState!.isHost && result.result === "finished" && nextStageId(sessionState!.stage) && (
                  <button onClick={startNextLevel} className="rounded-lg bg-emerald-500 px-5 py-2 font-semibold text-white hover:bg-emerald-400">
                    Next level ▶
                  </button>
                )}
                {sessionState!.isHost && (
                  <button onClick={playAgain} className="rounded-lg bg-sky-500 px-5 py-2 font-semibold text-white hover:bg-sky-400">
                    Play again
                  </button>
                )}
                <button onClick={backToRoom} className="rounded-lg border border-white/40 px-5 py-2 font-semibold text-white hover:bg-white/10">
                  Back to room
                </button>
              </div>
              {!sessionState!.isHost && <p className="text-sm text-neutral-300">Waiting for the host to restart…</p>}
            </Overlay>
          )}
        </div>
      )}

      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        Click a leg (or Space) to grab it · ←/→ swing · hold ↑ to lift, release to plant — walk the octopus to the arch, together.
      </p>
    </div>
  );
}

function Overlay({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        background: "rgba(15,23,42,0.72)",
        borderRadius: 12,
        color: "#fff",
        textAlign: "center",
        padding: 16,
      }}
    >
      {children}
    </div>
  );
}
