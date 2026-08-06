import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Phaser from "phaser";
import { OVERRUN_HEIGHT, OVERRUN_WIDTH, OverrunScene } from "../../../game/overrun/render/scene";
import type { OverrunConfig, OverrunEvent, OverrunHudState } from "../../../game/overrun/render/contract";
import { OverrunSession } from "../../../game/overrun/net/session";
import { buildJoinUrl, mintRoomId, parseRoomId } from "../../../game/net/roomLink";
import { buildIceServers, iceConfigFromEnv } from "../../../game/net/ice";
import { joinedIds } from "../../../game/net/lobby";
import { ArenaMusic, type ArenaMusicScene } from "../../../game/audio/music";
import { AudioSampleBank } from "../../../game/audio/samples";
import { Sfx } from "../../../game/audio/sfx";
import { fetchOverrunAssetManifest, type OverrunAssetManifest } from "../../../game/overrun/assets";
import type { PlayerId, ShooterWorld } from "../../../game/overrun/types";
import { accuracy, buildOverrunPrintPayload } from "../../../game/overrun/stats";
import { TOTAL_STAGES } from "../../../game/overrun/stages";
import { buildShopUrl, sanitizePayload } from "../../../lib/merch/print";
import OverrunWarmupRoom from "./OverrunWarmupRoom";
import { COIN_INSERT_MS } from "../lobby/CoinSlot";
import OverrunComic from "./OverrunComic";
import OverrunCountdown from "./hud/OverrunCountdown";
import AmmoBox from "./hud/AmmoBox";
import XpBar from "./hud/XpBar";
import PerkOffersOverlay from "./hud/PerkOffersOverlay";
import TeamStrip from "./hud/TeamStrip";

// STUN + (if provisioned) a TURN relay for cross-NAT play — TURN creds come from PUBLIC_* env at
// build time (see .env.example). Without TURN, two devices behind the same home NAT can't connect.
// Keys are read individually so Vite statically inlines each PUBLIC_* value into the client bundle.
const ICE_SERVERS: RTCIceServer[] = buildIceServers(
  iceConfigFromEnv({
    PUBLIC_STUN_URLS: import.meta.env.PUBLIC_STUN_URLS,
    PUBLIC_TURN_URLS: import.meta.env.PUBLIC_TURN_URLS,
    PUBLIC_TURN_URL: import.meta.env.PUBLIC_TURN_URL,
    PUBLIC_TURN_USERNAME: import.meta.env.PUBLIC_TURN_USERNAME,
    PUBLIC_TURN_CREDENTIAL: import.meta.env.PUBLIC_TURN_CREDENTIAL,
  }),
);

const FRESH_HUD: OverrunHudState = {
  countdown: 3,
  health: 100,
  maxHealth: 100,
  status: "alive",
  gun: "pistol",
  mag: 12,
  reserve: null,
  reloadFraction: 0,
  wave: 0,
  mode: "survival",
  stage: 1,
  stagesTotal: TOTAL_STAGES,
  intermission: 0,
  score: 0,
  xp: 0,
  xpNext: 20,
  level: 0,
  offer: null,
  offersQueued: 0,
  kills: 0,
  teammates: [],
};

/** Cheap signature so the teammate-strip only re-renders when a value visibly changes. */
function teammatesSig(list: OverrunHudState["teammates"]): string {
  return list.map((t) => `${t.id}:${t.status}:${Math.round(t.health)}`).join(",");
}

/**
 * Overrun island: warm-up room (lobby) → countdown → host-authoritative co-op wave
 * defense → scorecard. The renderer scene is fed the OverrunSession as its driver —
 * same shape as Arena's MatchDriver, but this game owns its own session/HUD/scene.
 */
type OverrunProps = {
  assetManifestUrl?: string;
};

export default function Overrun({ assetManifestUrl = "" }: OverrunProps = {}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sfxRef = useRef<Sfx>(new Sfx());
  const musicRef = useRef<ArenaMusic | null>(null);
  const samplesRef = useRef<AudioSampleBank | null>(null);
  const sessionRef = useRef<OverrunSession | null>(null);
  const lastHud = useRef<OverrunHudState | null>(null);
  const nameRef = useRef("Player");

  const [, forceRender] = useState(0);
  const bump = useCallback(() => forceRender((n) => n + 1), []);
  const [ready, setReady] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [name, setName] = useState("Player");
  const [mode, setMode] = useState<"campaign" | "survival">("campaign");
  const [hud, setHud] = useState<OverrunHudState>(FRESH_HUD);
  const [finalWorld, setFinalWorld] = useState<ShooterWorld | null>(null);
  const [assetManifest, setAssetManifest] = useState<OverrunAssetManifest | null>(null);
  const [assetsSettled, setAssetsSettled] = useState(!assetManifestUrl);

  useEffect(() => {
    if (!assetManifestUrl) {
      setAssetManifest(null);
      setAssetsSettled(true);
      return;
    }

    const controller = new AbortController();
    const fetcher: typeof fetch = (input, init) => fetch(input, { ...init, signal: controller.signal });
    setAssetsSettled(false);
    void fetchOverrunAssetManifest(assetManifestUrl, fetcher)
      .then((manifest) => setAssetManifest(manifest))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.warn("Overrun asset pack unavailable; using procedural fallbacks", error);
        setAssetManifest(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setAssetsSettled(true);
      });
    return () => controller.abort();
  }, [assetManifestUrl]);

  // --- create transport + session once (client only) ---
  useEffect(() => {
    let cancelled = false;
    let session: OverrunSession | null = null;
    (async () => {
      const existing = parseRoomId(window.location.search);
      const id = existing ?? mintRoomId();
      if (!existing) {
        window.history.replaceState(null, "", buildJoinUrl(window.location.origin, window.location.pathname, id));
      }
      setRoomId(id);
      const { createRtcTransport } = await import("../../../game/net/rtc"); // client-only (WebRTC)
      if (cancelled) return;
      const transport = createRtcTransport({ roomId: id, iceServers: ICE_SERVERS });
      session = new OverrunSession({ transport, name: nameRef.current, isCreator: !existing, onChange: bump });
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

  const onHud = useCallback((h: OverrunHudState) => {
    const p = lastHud.current;
    if (
      !p ||
      p.countdown !== h.countdown ||
      p.health !== h.health ||
      p.maxHealth !== h.maxHealth ||
      p.status !== h.status ||
      p.gun !== h.gun ||
      p.mag !== h.mag ||
      p.reserve !== h.reserve ||
      Math.abs(p.reloadFraction - h.reloadFraction) >= 0.02 ||
      p.wave !== h.wave ||
      p.stage !== h.stage ||
      Math.ceil(p.intermission) !== Math.ceil(h.intermission) ||
      Math.ceil(p.stageIntroRemaining ?? 0) !== Math.ceil(h.stageIntroRemaining ?? 0) ||
      p.score !== h.score ||
      p.xp !== h.xp ||
      p.xpNext !== h.xpNext ||
      p.level !== h.level ||
      p.offer !== h.offer ||
      p.offersQueued !== h.offersQueued ||
      p.kills !== h.kills ||
      teammatesSig(p.teammates) !== teammatesSig(h.teammates)
    ) {
      lastHud.current = h;
      setHud(h);
    }
  }, []);

  const onEvent = useCallback((e: OverrunEvent) => {
    const s = sfxRef.current;
    switch (e.type) {
      case "tik":
        s.play("tik");
        break;
      case "go":
        s.play("go");
        break;
      case "shot":
        if (!samplesRef.current?.play(`shot:${e.gun}`, e.gun === "shotgun" ? 0.58 : 0.48)) s.play("shoot");
        break;
      case "kill":
        break;
      case "pickup":
        if (!samplesRef.current?.play(e.item === "medkit" ? "pickup:medkit" : "pickup:weapon", 0.45)) s.play("join");
        break;
      case "levelup":
        if (!samplesRef.current?.play("levelup", 0.48)) s.play("go");
        break;
      case "downed":
        s.play(e.local ? "gameover" : "hit");
        break;
      case "revived":
        s.play("join");
        break;
      case "gameover":
        s.play("gameover");
        break;
      case "enemyHit":
        if (!samplesRef.current?.play("hit:enemy", 0.34)) s.play("hit");
        break;
      case "playerHit":
        if (e.local && !samplesRef.current?.play("hit:player", 0.55)) s.play("hurt");
        break;
      case "reload":
        if (!samplesRef.current?.play(`reload:${e.gun}`, 0.4)) s.play("reload");
        break;
    }
  }, []);

  // --- (re)create the Phaser game whenever the active match changes ---
  const sessionState = ready ? sessionRef.current!.getState() : null;
  const inMatch = !!sessionState && sessionState.phase !== "lobby";
  const musicScene: ArenaMusicScene = inMatch ? "battle" : "lobby";
  const musicSceneRef = useRef<ArenaMusicScene>(musicScene);
  musicSceneRef.current = musicScene;
  const gameKey = sessionState && sessionState.phase !== "lobby" ? `n${sessionState.matchEpoch}` : "";

  useEffect(() => {
    gameRef.current?.destroy(true);
    gameRef.current = null;
    const driver = sessionRef.current;
    if (!gameKey || !driver || !hostRef.current) return;

    setFinalWorld(null);
    lastHud.current = null;
    setHud(FRESH_HUD);
    const cfg: OverrunConfig = {
      driver,
      assets: assetManifest?.visuals,
      onHud,
      onEvent,
      onEnd: (w) => setFinalWorld(w),
    };
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      width: OVERRUN_WIDTH,
      height: OVERRUN_HEIGHT,
      parent: hostRef.current,
      backgroundColor: "#181c16",
      scene: [OverrunScene],
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_HORIZONTALLY },
      callbacks: { preBoot: (g) => g.registry.set("cfg", cfg) },
    });
    gameRef.current = game;
    if (import.meta.env.DEV) (window as unknown as { __overrunGame?: Phaser.Game }).__overrunGame = game;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetManifest, gameKey, onEvent, onHud]);

  // --- connect chime: play once when a new remote peer appears in the lobby roster ---
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
    if (!assetManifest) return;
    const music = new ArenaMusic(assetManifest.music);
    const samples = new AudioSampleBank({
      "shot:pistol": assetManifest.sfx.shots.pistol,
      "shot:shotgun": assetManifest.sfx.shots.shotgun,
      "shot:rifle": assetManifest.sfx.shots.rifle,
      "reload:pistol": assetManifest.sfx.reload.pistol,
      "reload:shotgun": assetManifest.sfx.reload.shotgun,
      "reload:rifle": assetManifest.sfx.reload.rifle,
      "hit:enemy": assetManifest.sfx.enemyHit,
      "hit:player": assetManifest.sfx.playerHit,
      "pickup:weapon": assetManifest.sfx.weaponPickup,
      "pickup:medkit": assetManifest.sfx.medkitPickup,
      levelup: assetManifest.sfx.levelUp,
    });
    music.setScene(musicSceneRef.current);
    musicRef.current = music;
    samplesRef.current = samples;
    return () => {
      music.destroy();
      samples.destroy();
      if (musicRef.current === music) musicRef.current = null;
      if (samplesRef.current === samples) samplesRef.current = null;
    };
  }, [assetManifest]);

  useEffect(() => {
    musicRef.current?.setScene(musicScene);
  }, [musicScene]);

  // Unlock all audio on the first user gesture so room music and SFX work pre-match.
  useEffect(() => {
    const unlock = () => {
      sfxRef.current.resume();
      musicRef.current?.unlock();
      samplesRef.current?.unlock();
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  // --- handlers ---
  const changeName = (n: string) => {
    setName(n);
    nameRef.current = n;
    sessionRef.current?.setProfile(n);
  };
  const startMatch = (selectedMode: "campaign" | "survival" = "survival") => {
    sfxRef.current.resume();
    musicRef.current?.unlock();
    samplesRef.current?.unlock();
    const session = sessionRef.current;
    if (!session) return;
    if (selectedMode === "campaign") {
      // Play the intro comic (synced to all peers) first; the host starts the match when it ends.
      session.signalIntro();
    } else {
      // Survival: coin-insert animation for everyone, then start.
      session.signalCoin();
      window.setTimeout(() => session.start(), COIN_INSERT_MS);
    }
  };
  // Host advances to the real match once the intro comic finishes (or is skipped).
  const onIntroDone = () => {
    const session = sessionRef.current;
    if (session?.getState().isHost) session.start("campaign");
  };
  const playAgain = () => {
    // Rematch keeps the mode of the run that just ended (finalWorld carries it).
    if (sessionState?.isHost) sessionRef.current?.start(finalWorld?.mode ?? "survival");
  };
  const backToLobby = () => {
    sessionRef.current?.toLobby();
    setFinalWorld(null);
  };

  if (!ready || !assetsSettled) {
    return <div className="py-16 text-center text-neutral-500">Deploying to the front line…</div>;
  }

  const joinUrl = buildJoinUrl(window.location.origin, window.location.pathname, roomId);
  const localId = sessionState!.localId;
  const canRematch = !!sessionState?.isHost;
  const phase = sessionState?.phase ?? null;
  const nameOf = (id: PlayerId) => sessionRef.current?.getMeta(id).name ?? id.slice(0, 6);

  return (
    <div className="flex flex-col items-center gap-3">
      {sessionState?.introPlaying && !inMatch ? (
        <div className="w-full">
          <OverrunComic onDone={onIntroDone} />
          {!sessionState.isHost && (
            <p className="mt-3 text-center font-display text-[9px] text-neutral-500">
              The host is starting the mission…
            </p>
          )}
        </div>
      ) : !inMatch ? (
        <OverrunWarmupRoom
          roster={sessionState!.roster}
          localId={sessionState!.localId}
          hostId={sessionState!.hostId}
          isHost={sessionState!.isHost}
          name={name}
          joinUrl={joinUrl}
          mode={mode}
          onMode={setMode}
          onName={changeName}
          onStart={startMatch}
          starting={sessionState!.starting}
          onKick={(id) => sessionRef.current?.kick(id)}
          onMakeHost={(id) => sessionRef.current?.makeHost(id)}
          soldierAssetUrl={assetManifest?.visuals.player.idle}
          weaponAssetUrls={assetManifest?.visuals.weapons}
        />
      ) : (
        <div
          style={{
            position: "relative",
            width: "100%",
            // Render at 1.4× the native canvas — matches Arena's on-screen px/metre so the game is the
            // same size on the page (Arena bakes the same 1.4 into its render scale).
            maxWidth: OVERRUN_WIDTH * 1.4,
            aspectRatio: `${OVERRUN_WIDTH} / ${OVERRUN_HEIGHT}`,
          }}
        >
          <div ref={hostRef} style={{ position: "absolute", inset: 0, borderRadius: 12, overflow: "hidden", background: "#181c16" }} />

          <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            {/* top-left: health + squad status */}
            <div style={{ position: "absolute", left: 12, top: 12, display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, width: 150 }}>
                <div
                  style={{
                    flex: 1,
                    height: 10,
                    borderRadius: 5,
                    background: "rgba(15,23,42,.7)",
                    border: "1px solid rgba(148,163,184,.35)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${Math.max(0, Math.min(1, hud.health / hud.maxHealth)) * 100}%`,
                      height: "100%",
                      background: "linear-gradient(90deg,#22c55e,#ef4444)",
                    }}
                  />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#f8fafc", fontFamily: "monospace" }}>
                  {Math.round(hud.health)}/{Math.round(hud.maxHealth)}
                </span>
              </div>
              <TeamStrip teammates={hud.teammates} />
            </div>

            {/* top-right: stage (campaign) + wave + score */}
            <div style={{ position: "absolute", right: 12, top: 12, textAlign: "right" }}>
              {hud.mode === "campaign" && (
                <div style={{ fontSize: 11, fontWeight: 800, color: "#f87171", fontFamily: "monospace", letterSpacing: 1 }}>
                  STAGE {hud.stage}/{hud.stagesTotal}
                </div>
              )}
              <div style={{ fontSize: 13, fontWeight: 800, color: "#f8fafc", fontFamily: "monospace" }}>
                {hud.intermission > 0 ? `NEXT WAVE IN ${Math.ceil(hud.intermission)}` : `WAVE ${hud.wave}`}
              </div>
              <div style={{ fontSize: 12, color: "#fbbf24", fontFamily: "monospace" }}>SCORE {hud.score}</div>
            </div>

            {/* bottom-left: ammo */}
            <div style={{ position: "absolute", left: 12, bottom: 12 }}>
              <AmmoBox gun={hud.gun} mag={hud.mag} reserve={hud.reserve} reloadFraction={hud.reloadFraction} />
            </div>

            {/* bottom-center: xp */}
            <div style={{ position: "absolute", left: "50%", bottom: 12, transform: "translateX(-50%)" }}>
              <XpBar xp={hud.xp} xpNext={hud.xpNext} level={hud.level} />
            </div>

            {/* right edge: perk offers */}
            <PerkOffersOverlay offer={hud.offer} queued={hud.offersQueued} onPick={(i) => sessionRef.current?.pickPerk(i)} />

            {hud.status === "downed" && (
              <div
                className="animate-pulse"
                style={{
                  position: "absolute",
                  top: "40%",
                  left: "50%",
                  transform: "translateX(-50%)",
                  color: "#ef4444",
                  fontWeight: 800,
                  fontSize: 18,
                  textAlign: "center",
                  textShadow: "0 2px 8px rgba(0,0,0,.7)",
                }}
              >
                DOWNED — a teammate can revive you
              </div>
            )}
          </div>

          {hud.countdown > 0 && <OverrunCountdown n={hud.countdown} />}

          {/* Between-stage comic beat (synced): the party regroups at a fresh stage (level + pistol reset). */}
          {(hud.stageIntroRemaining ?? 0) > 0 && (
            <div className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 bg-black/72 text-center">
              <p className="font-display text-[9px] tracking-widest text-amber-300">STAGE {hud.stage} / {hud.stagesTotal}</p>
              <h2 className="neon font-display text-2xl text-emerald-300 sm:text-4xl">STAGE {hud.stage}</h2>
              <p className="text-sm text-stone-300">Fresh loadout — the horde regroups. Get ready.</p>
            </div>
          )}

          {/* Final scorecard: per-player stats + merch link. Stays connected. */}
          {(phase === "ended" || phase === "victory") && finalWorld && (
            <Overlay>
              {phase === "victory" ? (
                <>
                  <h2 className="neon text-3xl font-bold text-emerald-400">★ CAMPAIGN CLEARED ★</h2>
                  <p className="text-lg">Party score: {finalWorld.score}</p>
                </>
              ) : (
                <>
                  <h2 className="text-3xl font-bold">WAVE {finalWorld.wave}</h2>
                  <p className="text-lg">Party score: {finalWorld.score}</p>
                </>
              )}
              <table className="mt-1 border-separate border-spacing-x-4 text-sm text-neutral-200">
                <thead className="text-xs uppercase tracking-wide text-neutral-400">
                  <tr>
                    <th className="text-left">Player</th>
                    <th>Kills</th>
                    <th>Accuracy</th>
                    <th>Level</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.values(finalWorld.players)
                    .sort((a, b) => sessionRef.current!.getMeta(a.id).colorIndex - sessionRef.current!.getMeta(b.id).colorIndex)
                    .map((p) => (
                      <tr key={p.id} className={p.id === localId ? "font-semibold text-white" : ""}>
                        <td className="text-left">
                          {nameOf(p.id)}
                          {p.id === localId && " (you)"}
                        </td>
                        <td className="text-center">{p.stats.kills}</td>
                        <td className="text-center">{Math.round(accuracy(p.stats) * 100)}%</td>
                        <td className="text-center">{p.level}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
              <div className="mt-1 flex gap-3">
                {canRematch && (
                  <button onClick={playAgain} className="rounded-lg bg-red-600 px-5 py-2 font-semibold text-white hover:bg-red-500">
                    Play again
                  </button>
                )}
                <button onClick={backToLobby} className="rounded-lg border border-white/40 px-5 py-2 font-semibold text-white hover:bg-white/10">
                  Back to room
                </button>
              </div>
              {!canRematch && <p className="text-sm text-neutral-300">Waiting for the host to restart…</p>}
              {/* trophy shop: immortalize the run on merch (sandbox store — nothing charged/shipped) */}
              {(() => {
                const payload = sanitizePayload(buildOverrunPrintPayload(finalWorld, localId));
                return (
                  <a
                    href={buildShopUrl("tee", payload)}
                    className="mt-1 rounded-lg border border-amber-300/60 px-5 py-2 font-semibold text-amber-300 hover:bg-amber-300/10"
                  >
                    🏆 Print this run on a tee
                  </a>
                );
              })()}
              <p className="text-xs text-neutral-400">Test-mode store — nothing is charged or shipped.</p>
            </Overlay>
          )}
        </div>
      )}

      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        WASD move · mouse aim · hold LMB fire · R reload · 1/2/3 perks — open the invite link in another browser to co-op.
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
