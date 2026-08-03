import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Phaser from "phaser";
import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  ArenaScene,
  type ArenaConfig,
} from "../../game/arena/render/scene";
import type {
  ArenaEvent,
  HudState,
  MatchDriver,
} from "../../game/arena/render/contract";
import { Session } from "../../game/net/session";
import { SoloDriver } from "../../game/arena/soloDriver";
import { SandboxDriver } from "../../game/arena/sandboxDriver";
import { parseSandboxConfig } from "../../game/arena/sandbox";
import SandboxControls from "./SandboxControls";
import { buildJoinUrl, mintRoomId, parseRoomId } from "../../game/net/roomLink";
import { buildIceServers, iceConfigFromEnv } from "../../game/net/ice";
import { joinedIds } from "../../game/net/lobby";
import { ArenaMusic, type ArenaMusicScene } from "../../game/audio/music";
import { AudioSampleBank } from "../../game/audio/samples";
import { Sfx } from "../../game/audio/sfx";
import type { PlayerId } from "../../game/arena/types";
import {
  DEFAULT_SHAPE,
  coercePremiumShapes,
  coerceShape,
  isPremiumShape,
  ownsShape,
  playableShape,
  type Shape,
} from "../../game/arena/cosmetic";
import {
  DEFAULT_WEAPON,
  ownsWeapon,
  playableWeapon,
  type Weapon,
} from "../../game/arena/weapons";
import { DEFAULT_MODE, modeInfo, type GameMode } from "../../game/arena/modes";
import { SURVIVAL_PARTY_WINNER } from "../../game/arena/survival/step";
import { buildShopUrl, matchResultPayload } from "../../lib/merch/print";
import { BODY_ASSET } from "../../game/arena/cosmetic";
import MerchPreviewInline from "../merch/MerchPreviewInline";
import WarmupRoom from "./lobby/WarmupRoom";
import { COIN_INSERT_MS } from "./lobby/CoinSlot";
import Hearts from "./hud/Hearts";
import CooldownBadge from "./hud/CooldownBadge";
import Countdown from "./hud/Countdown";

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
const FRESH_HUD: HudState = {
  countdown: 3,
  health: 3,
  dashFraction: 1,
  attackFraction: 1,
  blockFraction: 1,
  alive: true,
};

/**
 * Arena island: warm-up room (lobby) → countdown → host-authoritative match → result.
 * The renderer scene is fed a MatchDriver — the netplay Session for multiplayer, or a
 * SoloDriver for practice — so the same canvas serves both.
 */
type ArenaProps = {
  isMember?: boolean;
  avatarUrl?: string | null;
  ownedPremiumShapes?: Shape[];
  lobbyMusicUrl?: string;
  battleMusicUrl?: string;
  blockSoundUrl?: string;
};

export default function Arena({
  isMember = false,
  avatarUrl = null,
  ownedPremiumShapes = [],
  lobbyMusicUrl = "",
  battleMusicUrl = "",
  blockSoundUrl = "",
}: ArenaProps = {}) {
  const arenaFrameRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sfxRef = useRef<Sfx>(new Sfx());
  const musicRef = useRef<ArenaMusic | null>(null);
  const blockSfxRef = useRef<AudioSampleBank | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const activeDriverRef = useRef<MatchDriver | null>(null);
  const lastHud = useRef<HudState | null>(null);
  const lastBotCount = useRef(0);
  const lastRounds = useRef(1);
  const lastMode = useRef<GameMode>(DEFAULT_MODE);
  const nameRef = useRef("Player");
  const shapeRef = useRef<Shape>(DEFAULT_SHAPE);
  const weaponRef = useRef<Weapon>(DEFAULT_WEAPON);
  const avatarUrlRef = useRef<string | null>(avatarUrl); // current Arena face photo used when the session starts
  const ownedPremiumShapesRef = useRef<Shape[]>(
    coercePremiumShapes(ownedPremiumShapes),
  );

  const [, forceRender] = useState(0);
  const bump = useCallback(() => forceRender((n) => n + 1), []);
  const [ready, setReady] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [name, setName] = useState("Player");
  const [shape, setShape] = useState<Shape>(DEFAULT_SHAPE);
  const [weapon, setWeapon] = useState<Weapon>(DEFAULT_WEAPON);
  const [arenaAvatarUrl, setArenaAvatarUrl] = useState<string | null>(
    avatarUrl,
  );
  const [arenaOwnedPremiumShapes, setArenaOwnedPremiumShapes] = useState<
    Shape[]
  >(coercePremiumShapes(ownedPremiumShapes));
  const [mode, setMode] = useState<GameMode>(DEFAULT_MODE);
  const [practiceDriver, setPracticeDriver] = useState<SoloDriver | null>(null);
  const [practiceEpoch, setPracticeEpoch] = useState(0);
  // Dev-only test harness: `?sandbox` (dev builds only) drops straight into a local sandbox driver,
  // skipping the lobby/session. Config comes entirely from the query (see sandbox.ts).
  const [sandboxDriver] = useState<SandboxDriver | null>(() => {
    if (!import.meta.env.DEV || typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    return params.has("sandbox") ? new SandboxDriver(parseSandboxConfig(params)) : null;
  });
  const [hud, setHud] = useState<HudState>(FRESH_HUD);
  const [result, setResult] = useState<{ winnerId: PlayerId | null } | null>(
    null,
  );

  // --- create transport + session once (client only) ---
  useEffect(() => {
    if (sandboxDriver) return; // sandbox runs a local driver — no room/session/RTC
    let cancelled = false;
    let session: Session | null = null;
    (async () => {
      const existing = parseRoomId(window.location.search);
      const id = existing ?? mintRoomId();
      if (!existing) {
        window.history.replaceState(
          null,
          "",
          buildJoinUrl(window.location.origin, window.location.pathname, id),
        );
      }
      setRoomId(id);
      const { createRtcTransport } = await import("../../game/net/rtc"); // client-only (WebRTC)
      if (cancelled) return;
      const transport = createRtcTransport({
        roomId: id,
        iceServers: ICE_SERVERS,
      });
      session = new Session({
        transport,
        name: nameRef.current,
        shape: shapeRef.current,
        weapon: weaponRef.current,
        avatarUrl: avatarUrlRef.current,
        ownedPremiumShapes: ownedPremiumShapesRef.current,
        isCreator: !existing,
        onChange: bump,
      });
      sessionRef.current = session;
      setReady(true);
    })();
    return () => {
      cancelled = true;
      session?.leave();
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [bump, sandboxDriver]);

  const onHud = useCallback((h: HudState) => {
    const p = lastHud.current;
    if (
      !p ||
      p.countdown !== h.countdown ||
      p.health !== h.health ||
      p.alive !== h.alive ||
      Math.abs(p.dashFraction - h.dashFraction) >= 0.02 ||
      Math.abs(p.attackFraction - h.attackFraction) >= 0.02 ||
      Math.abs(p.blockFraction - h.blockFraction) >= 0.02
    ) {
      lastHud.current = h;
      setHud(h);
    }
  }, []);

  const onEvent = useCallback((e: ArenaEvent) => {
    const s = sfxRef.current;
    if (e.type === "tik") s.play("tik");
    else if (e.type === "go") s.play("go");
    else if (e.type === "dash") s.play("dash");
    else if (e.type === "attack") s.play("attack");
    else if (e.type === "block" && !blockSfxRef.current?.play("block", 0.7))
      s.play("block");
    else if (e.type === "shoot") s.play("shoot");
    else if (e.type === "hit") s.play("hit");
    else if (e.type === "death" && e.local) s.play("gameover");
  }, []);

  // --- (re)create the Phaser game whenever the active match changes ---
  const sessionState = ready ? sessionRef.current!.getState() : null;
  const inMatch =
    !!sandboxDriver || !!practiceDriver || (!!sessionState && sessionState.phase !== "lobby");
  const musicScene: ArenaMusicScene = inMatch ? "battle" : "lobby";
  const musicSceneRef = useRef<ArenaMusicScene>(musicScene);
  musicSceneRef.current = musicScene;
  const gameKey = sandboxDriver
    ? "sbx"
    : practiceDriver
      ? `p${practiceEpoch}`
      : sessionState && sessionState.phase !== "lobby"
        ? `n${sessionState.matchEpoch}`
        : "";
  activeDriverRef.current =
    sandboxDriver ??
    practiceDriver ??
    (sessionState && sessionState.phase !== "lobby"
      ? sessionRef.current
      : null);

  useEffect(() => {
    gameRef.current?.destroy(true);
    gameRef.current = null;
    const driver = activeDriverRef.current;
    if (!gameKey || !driver || !hostRef.current) return;

    setResult(null);
    lastHud.current = null;
    setHud(FRESH_HUD);
    const cfg: ArenaConfig = {
      driver,
      onHud,
      onEvent,
      onEnd: (winnerId) => setResult({ winnerId }),
    };
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      width: ARENA_WIDTH,
      height: ARENA_HEIGHT,
      parent: hostRef.current,
      backgroundColor: "#0f172a",
      scene: [ArenaScene],
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_HORIZONTALLY,
      },
      callbacks: { preBoot: (g) => g.registry.set("cfg", cfg) },
    });
    gameRef.current = game;
    if (import.meta.env.DEV)
      (window as unknown as { __arenaGame?: Phaser.Game }).__arenaGame = game;

    const focusFrame = window.requestAnimationFrame(() => {
      const frame = arenaFrameRef.current;
      if (!frame) return;

      const rect = frame.getBoundingClientRect();
      const viewportHeight =
        window.innerHeight || document.documentElement.clientHeight;
      const stickyNav = document.querySelector<HTMLElement>("nav.sticky");
      const safeTop =
        Math.max(0, stickyNav?.getBoundingClientRect().bottom ?? 0) + 12;
      const visibleHeight = Math.max(
        0,
        Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, safeTop),
      );
      const usefulHeight =
        Math.min(rect.height, Math.max(0, viewportHeight - safeTop)) * 0.5;
      const topIsVisible = rect.top >= safeTop && rect.top < viewportHeight;

      if (!topIsVisible || visibleHeight < usefulHeight) {
        const reducedMotion =
          window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ??
          false;
        window.scrollTo({
          top: Math.max(0, window.scrollY + rect.top - safeTop),
          behavior: reducedMotion ? "auto" : "smooth",
        });
      }
      frame.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(focusFrame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameKey, onEvent, onHud]);

  // --- connect chime: play once when a new remote peer appears in the lobby roster ---
  const rosterIds = sessionState ? sessionState.roster.map((pl) => pl.id) : [];
  const rosterKey = rosterIds.join(",");
  const prevRosterIdsRef = useRef<string[]>([]);
  useEffect(() => {
    if (!sessionState) return;
    const joined = joinedIds(
      prevRosterIdsRef.current,
      rosterIds,
      sessionState.localId,
    );
    prevRosterIdsRef.current = rosterIds;
    if (joined.length > 0) sfxRef.current.play("join");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rosterKey]);

  useEffect(() => {
    if (!lobbyMusicUrl || !battleMusicUrl) return;
    const music = new ArenaMusic({
      lobby: lobbyMusicUrl,
      battle: battleMusicUrl,
    });
    music.setScene(musicSceneRef.current);
    musicRef.current = music;
    return () => {
      music.destroy();
      if (musicRef.current === music) musicRef.current = null;
    };
  }, [battleMusicUrl, lobbyMusicUrl]);

  useEffect(() => {
    if (!blockSoundUrl) return;
    const bank = new AudioSampleBank({ block: [blockSoundUrl] });
    blockSfxRef.current = bank;
    return () => {
      bank.destroy();
      if (blockSfxRef.current === bank) blockSfxRef.current = null;
    };
  }, [blockSoundUrl]);

  useEffect(() => {
    musicRef.current?.setScene(musicScene);
  }, [musicScene]);

  // Unlock audio on the first user gesture so lobby music and SFX work before the match.
  useEffect(() => {
    const unlock = () => {
      sfxRef.current.resume();
      musicRef.current?.unlock();
      blockSfxRef.current?.unlock();
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
    sessionRef.current?.setProfile(n, shapeRef.current);
  };
  const changeShape = (s: Shape) => {
    setShape(s);
    shapeRef.current = s;
    sessionRef.current?.setProfile(nameRef.current, s, weaponRef.current);
  };
  const changeWeapon = (w: Weapon) => {
    setWeapon(w);
    weaponRef.current = w;
    sessionRef.current?.setProfile(nameRef.current, shapeRef.current, w);
  };
  const unlockSkin = (s: Shape) => {
    window.open(
      `/api/arena-skin-checkout?skin=${encodeURIComponent(s)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };
  const changeAvatar = (url: string | null) => {
    setArenaAvatarUrl(url);
    avatarUrlRef.current = url;
    sessionRef.current?.setAvatarUrl(url);
  };
  const startMatch = (
    bots: number,
    rounds = 1,
    selectedMode: GameMode = DEFAULT_MODE,
    viaCoin = false,
  ) => {
    sfxRef.current.resume();
    musicRef.current?.unlock();
    blockSfxRef.current?.unlock();
    lastBotCount.current = bots;
    lastRounds.current = rounds;
    lastMode.current = selectedMode;
    if (!ownsShape(shapeRef.current, ownedPremiumShapesRef.current)) {
      changeShape(
        playableShape(
          shapeRef.current,
          ownedPremiumShapesRef.current,
          sessionRef.current?.localId ?? nameRef.current,
        ),
      );
    }
    if (!ownsWeapon(weaponRef.current, ownedPremiumShapesRef.current)) {
      changeWeapon(playableWeapon(weaponRef.current, ownedPremiumShapesRef.current));
    }
    const session = sessionRef.current;
    if (!session) return;
    // From the warm-up room: insert the coin (all peers see the drop) then start after the animation.
    if (viaCoin) {
      session.signalCoin();
      window.setTimeout(() => session.start(bots, rounds, selectedMode), COIN_INSERT_MS);
    } else {
      session.start(bots, rounds, selectedMode);
    }
  };
  // Offline, zero-netcode solo warm-up vs bots. Currently has no UI entry point
  // (the "Practice vs bots" button was removed) — kept intact for future re-exposure.
  const practice = () => {
    sfxRef.current.resume();
    musicRef.current?.unlock();
    blockSfxRef.current?.unlock();
    setPracticeDriver(new SoloDriver(3));
    setPracticeEpoch((n) => n + 1);
  };
  const playAgain = () => {
    if (practiceDriver) {
      setPracticeDriver(new SoloDriver(3));
      setPracticeEpoch((n) => n + 1);
    } else if (sessionState?.isHost) {
      startMatch(lastBotCount.current, lastRounds.current, lastMode.current);
    }
  };
  const backToLobby = () => {
    if (practiceDriver) setPracticeDriver(null);
    else sessionRef.current?.toLobby();
    setResult(null);
  };

  useEffect(() => {
    const syncOwnedSkins = async () => {
      if (!isMember) return;
      try {
        const res = await fetch("/api/arena-skins", { cache: "no-store" });
        if (!res.ok) return;
        const body = (await res.json()) as { ownedPremiumShapes?: unknown };
        const next = coercePremiumShapes(body.ownedPremiumShapes);
        ownedPremiumShapesRef.current = next;
        setArenaOwnedPremiumShapes(next);
        sessionRef.current?.setOwnedPremiumShapes(next);

        const requested = new URLSearchParams(window.location.search).get(
          "skin",
        );
        const requestedShape = requested ? coerceShape(requested) : null;
        if (requestedShape && ownsShape(requestedShape, next)) {
          changeShape(requestedShape);
        } else if (
          isPremiumShape(shapeRef.current) &&
          !ownsShape(shapeRef.current, next)
        ) {
          changeShape(
            playableShape(
              shapeRef.current,
              next,
              sessionRef.current?.localId ?? nameRef.current,
            ),
          );
        }
      } catch {
        /* Ownership refresh is best-effort; the SSR value still drives the initial render. */
      }
    };

    void syncOwnedSkins();
    window.addEventListener("focus", syncOwnedSkins);
    return () => window.removeEventListener("focus", syncOwnedSkins);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMember]);

  if (!ready) {
    return (
      <div className="py-16 text-center text-neutral-500">
        Connecting to the arena…
      </div>
    );
  }

  const joinUrl = buildJoinUrl(
    window.location.origin,
    window.location.pathname,
    roomId,
  );
  const localId = sandboxDriver
    ? sandboxDriver.localId
    : practiceDriver
      ? practiceDriver.localId
      : sessionState!.localId;
  const youWon = result?.winnerId === localId;
  const canRematch = !!practiceDriver || !!sessionState?.isHost;

  // Netplay round overlays (P8): driven by the session phase + host-authoritative board.
  const phase = sessionState?.phase ?? null;
  const board = sessionState?.board ?? null;
  const nameOf = (id: PlayerId) =>
    sessionRef.current?.getMeta(id).name ?? id.slice(0, 6);
  const roundWinnerId = result?.winnerId ?? null; // winner of the round that just ended
  const matchWinnerId =
    board?.podium.find((p) => p.place === 1)?.players[0] ?? null;
  const youWonMatch =
    board?.podium.some((p) => p.place === 1 && p.players.includes(localId)) ??
    false;
  // Coop Survival ends on the co-op "party" win sentinel or a wipe (winnerId null) — NOT a versus
  // podium. Derive the outcome from that so a lost run never reads as "YOU WON!".
  const survivalMatch = modeInfo(sessionState?.mode ?? DEFAULT_MODE).rules === "survival";
  const survivalWon = survivalMatch && result?.winnerId === SURVIVAL_PARTY_WINNER;
  const localWon = survivalMatch ? survivalWon : youWonMatch;
  const standingsOrder = board ? board.podium.flatMap((pl) => pl.players) : [];
  const localStats = board?.stats[localId];
  const loserNames = standingsOrder
    .filter((id) => id !== matchWinnerId)
    .map(nameOf);
  const matchPayload = matchResultPayload({
    youWon: localWon,
    winnerId: matchWinnerId,
    winnerName: matchWinnerId ? nameOf(matchWinnerId) : null,
    loserNames,
    localHits: localStats?.hits ?? 0,
    localDistanceM: localStats?.distance ?? 0,
    date: new Date()
      .toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
      .toUpperCase(),
  });
  const warriorSrc = BODY_ASSET[shape];

  return (
    <div className="flex flex-col items-center gap-3">
      {!inMatch ? (
        <WarmupRoom
          roster={sessionState!.roster}
          localId={sessionState!.localId}
          hostId={sessionState!.hostId}
          isHost={sessionState!.isHost}
          name={name}
          shape={shape}
          weapon={weapon}
          mode={mode}
          joinUrl={joinUrl}
          onName={changeName}
          onShape={changeShape}
          onWeapon={changeWeapon}
          onUnlockSkin={unlockSkin}
          onAvatar={changeAvatar}
          onMode={setMode}
          onStart={(bots, rounds, selectedMode) => startMatch(bots, rounds, selectedMode, true)}
          starting={sessionState!.starting}
          onKick={(id) => sessionRef.current?.kick(id)}
          onMakeHost={(id) => sessionRef.current?.makeHost(id)}
          isMember={isMember}
          avatarUrl={arenaAvatarUrl}
          ownedPremiumShapes={arenaOwnedPremiumShapes}
        />
      ) : (
        <div
          ref={arenaFrameRef}
          data-arena-frame
          tabIndex={-1}
          style={{
            position: "relative",
            width: "100%",
            maxWidth: ARENA_WIDTH,
            aspectRatio: `${ARENA_WIDTH} / ${ARENA_HEIGHT}`,
            outline: "none",
          }}
        >
          <div
            ref={hostRef}
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 12,
              overflow: "hidden",
              background: "#0f172a",
            }}
          />

          {sandboxDriver && <SandboxControls driver={sandboxDriver} />}

          <div
            style={{
              position: "absolute",
              left: 12,
              top: 12,
              display: "flex",
              gap: 16,
              alignItems: "center",
              pointerEvents: "none",
            }}
          >
            <Hearts health={hud.health} />
            <CooldownBadge
              fraction={hud.dashFraction}
              glyph="➤"
              color="#38bdf8"
            />
            <CooldownBadge
              fraction={hud.attackFraction}
              glyph="⚔"
              color="#fbbf24"
            />
            <CooldownBadge
              fraction={hud.blockFraction}
              glyph="◈"
              color="#34d399"
            />
          </div>

          {hud.countdown > 0 && <Countdown n={hud.countdown} />}

          {!hud.alive && !result && (
            <div
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                color: "#fca5a5",
                fontWeight: 600,
              }}
            >
              Spectating…
            </div>
          )}

          {/* Practice (solo) keeps the single-match result overlay. */}
          {practiceDriver && result && (
            <Overlay>
              <h2 className="text-4xl font-bold">
                {youWon
                  ? "You win! 🏆"
                  : result.winnerId
                    ? "You're out ☠️"
                    : "Draw"}
              </h2>
              <div className="flex gap-3">
                {canRematch && (
                  <button
                    onClick={playAgain}
                    className="rounded-lg bg-sky-500 px-5 py-2 font-semibold text-white hover:bg-sky-400"
                  >
                    Play again
                  </button>
                )}
                <button
                  onClick={backToLobby}
                  className="rounded-lg border border-white/40 px-5 py-2 font-semibold text-white hover:bg-white/10"
                >
                  Back to room
                </button>
              </div>
            </Overlay>
          )}

          {/* Netplay: between-rounds pause — host advances, everyone else waits. */}
          {!practiceDriver && phase === "roundover" && (
            <Overlay>
              <h2 className="text-3xl font-bold">
                {sessionState?.roundTiebreak
                  ? "Sudden death"
                  : `Round ${sessionState?.roundNumber} of ${sessionState?.roundsTotal} — complete`}
              </h2>
              <p className="text-lg">
                {roundWinnerId
                  ? `${nameOf(roundWinnerId)} takes the round`
                  : "Draw round"}
              </p>
              {board && (
                <div className="flex flex-col gap-1 text-sm text-neutral-200">
                  {standingsOrder.map((id) => (
                    <div key={id}>
                      {nameOf(id)}
                      {id === localId && " (you)"} — {board.wins[id] ?? 0}{" "}
                      {(board.wins[id] ?? 0) === 1 ? "win" : "wins"}
                    </div>
                  ))}
                </div>
              )}
              {sessionState?.isHost ? (
                <button
                  onClick={() => sessionRef.current?.nextRoundAction()}
                  className="rounded-lg bg-sky-500 px-5 py-2 font-semibold text-white hover:bg-sky-400"
                >
                  Next round →
                </button>
              ) : (
                <p className="text-sm text-neutral-300">
                  Waiting for the host to start the next round…
                </p>
              )}
            </Overlay>
          )}

          {/* Netplay: final scoreboard — scores, winner, and per-player stats. Stays connected. */}
          {!practiceDriver && phase === "ended" && board && (
            <Overlay>
              {/* Outcome card: tee preview + rich result text */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  background: "rgba(255,255,255,0.05)",
                  borderRadius: 10,
                  padding: "10px 14px",
                  width: "100%",
                  maxWidth: 420,
                }}
              >
                <div style={{ width: 72, height: 72, flexShrink: 0 }}>
                  <MerchPreviewInline
                    product="tee"
                    title={matchPayload.title}
                    sub={matchPayload.sub}
                    warriorSrc={warriorSrc}
                    avatarUrl={arenaAvatarUrl}
                  />
                </div>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <p
                    style={{
                      fontWeight: 700,
                      fontSize: "0.95rem",
                      lineHeight: 1.3,
                      color: localWon
                        ? "#fcd34d"
                        : survivalMatch || matchWinnerId
                          ? "#fca5a5"
                          : "#e2e8f0",
                    }}
                  >
                    {survivalMatch
                      ? survivalWon
                        ? "CAMPAIGN CLEARED!"
                        : "WIPED OUT"
                      : youWonMatch
                        ? "YOU WON!"
                        : matchWinnerId
                          ? `YOU LOST TO ${nameOf(matchWinnerId).toUpperCase()}`
                          : "MUTUAL DESTRUCTION"}
                  </p>
                  {!survivalMatch && youWonMatch && loserNames.length > 0 && (
                    <p
                      style={{
                        fontSize: "0.7rem",
                        color: "#94a3b8",
                        marginTop: 4,
                      }}
                    >
                      {"Defeated: " + loserNames.join(", ")}
                    </p>
                  )}
                  {!survivalMatch && !youWonMatch && matchWinnerId && (
                    <p
                      style={{
                        fontSize: "0.7rem",
                        color: "#94a3b8",
                        marginTop: 4,
                      }}
                    >
                      {"GG · " + nameOf(matchWinnerId) + " dominated"}
                    </p>
                  )}
                </div>
              </div>

              <table className="mt-1 border-separate border-spacing-x-4 text-sm text-neutral-200">
                <thead className="text-xs uppercase tracking-wide text-neutral-400">
                  <tr>
                    <th className="text-left">#</th>
                    <th className="text-left">Player</th>
                    <th>Wins</th>
                    <th>Hits</th>
                    <th>Misses</th>
                    <th>Distance</th>
                  </tr>
                </thead>
                <tbody>
                  {board.podium.flatMap((pl) =>
                    pl.players.map((id) => {
                      const s = board.stats[id];
                      return (
                        <tr
                          key={id}
                          className={
                            id === localId ? "font-semibold text-white" : ""
                          }
                        >
                          <td>{pl.place}</td>
                          <td className="text-left">
                            {nameOf(id)}
                            {id === localId && " (you)"}
                          </td>
                          <td className="text-center">{board.wins[id] ?? 0}</td>
                          <td className="text-center">{s?.hits ?? 0}</td>
                          <td className="text-center">{s?.misses ?? 0}</td>
                          <td className="text-center">
                            {Math.round(s?.distance ?? 0)} m
                          </td>
                        </tr>
                      );
                    }),
                  )}
                </tbody>
              </table>
              <div className="mt-1 flex gap-3">
                {canRematch && (
                  <button
                    onClick={playAgain}
                    className="rounded-lg bg-sky-500 px-5 py-2 font-semibold text-white hover:bg-sky-400"
                  >
                    Play again
                  </button>
                )}
                <button
                  onClick={backToLobby}
                  className="rounded-lg border border-white/40 px-5 py-2 font-semibold text-white hover:bg-white/10"
                >
                  Back to room
                </button>
              </div>
              {!canRematch && (
                <p className="text-sm text-neutral-300">
                  Waiting for the host to restart…
                </p>
              )}
              <div className="w-full">
                <p className="mb-2 text-center font-display text-[9px] uppercase tracking-widest text-neutral-500">
                  Immortalise your result
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {(["tee", "mug", "keychain", "poster"] as const).map(
                    (slug) => (
                      <a
                        key={slug}
                        href={buildShopUrl(slug, matchPayload, {
                          warriorSrc,
                          avatarUrl: arenaAvatarUrl,
                        })}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center gap-1 rounded-lg border border-white/10 p-2 text-neutral-300 no-underline transition hover:border-cyan-400/50 hover:bg-white/5"
                        style={{ width: 90 }}
                      >
                        <div style={{ width: 80, height: 80 }}>
                          <MerchPreviewInline
                            product={slug}
                            title={matchPayload.title}
                            sub={matchPayload.sub}
                            warriorSrc={warriorSrc}
                            avatarUrl={arenaAvatarUrl}
                          />
                        </div>
                        <span className="text-center font-display text-[8px] leading-tight text-neutral-300">
                          {slug === "tee"
                            ? "Score Tee"
                            : slug === "mug"
                              ? "Victory Mug"
                              : slug === "keychain"
                                ? "Fighter Key"
                                : "Match Poster"}
                        </span>
                        <span className="font-display text-[8px] text-cyan-400">
                          Shop →
                        </span>
                      </a>
                    ),
                  )}
                </div>
                <p className="mt-2 text-center text-xs text-neutral-500">
                  Test-mode store — nothing is charged or shipped.
                </p>
              </div>
            </Overlay>
          )}
        </div>
      )}

      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        WASD/arrows move · Shift dash · Space attack · Ctrl/right mouse block —
        open the invite link in another browser to play together.
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
