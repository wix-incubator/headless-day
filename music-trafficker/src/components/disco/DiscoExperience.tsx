import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import DiscoScene, { type SceneApi } from "./DiscoScene";
import ThreadPopup from "./ThreadPopup";
import LoginLink, { useResetOnPageShow } from "./LoginLink";
import type { VideoItem } from "./types";

type Phase = "idle" | "flying" | "playing" | "closing";

const FAST_POLL_MS = 10_000; // while storyboards are still resolving
const SLOW_POLL_MS = 5 * 60_000; // steady state: pick up newly published videos
const MAX_FAST_POLLS = 40;

function LogoutForm({ name }: { name: string }) {
  const [busy, setBusy] = useState(false);
  useResetOnPageShow(setBusy);
  return (
    <form
      method="POST"
      action="/api/auth/logout?returnUrl=/"
      onSubmit={(e) => {
        if (busy) {
          e.preventDefault();
          return;
        }
        setBusy(true);
      }}
    >
      <span>{name}</span>
      <button type="submit" disabled={busy}>
        {busy && <span className="auth-spinner" aria-hidden="true" />}
        {busy ? "Logging out…" : "Log out"}
      </button>
    </form>
  );
}

function feedChanged(current: VideoItem[] | null, incoming: VideoItem[]) {
  if (!current || current.length !== incoming.length) return true;
  return incoming.some(
    (v, i) =>
      v.id !== current[i].id ||
      !!v.storyboard !== !!current[i].storyboard ||
      !!v.motionPreview !== !!current[i].motionPreview,
  );
}

export default function DiscoExperience() {
  const [videos, setVideos] = useState<VideoItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [active, setActive] = useState<VideoItem | null>(null);
  const [threadOpen, setThreadOpen] = useState(false);
  const [me, setMe] = useState<{ name: string } | null>(null);
  const sceneApi = useRef<SceneApi | null>(null);
  const videosRef = useRef<VideoItem[] | null>(null);
  const phaseRef = useRef<Phase>("idle");
  const pendingVideosRef = useRef<VideoItem[] | null>(null);
  phaseRef.current = phase;

  const applyVideos = useCallback((list: VideoItem[]) => {
    videosRef.current = list;
    // Swapping the list mid-flight would yank the tile out from under the
    // animation — defer to the next idle moment.
    if (phaseRef.current === "idle") setVideos(list);
    else pendingVideosRef.current = list;
  }, []);

  useEffect(() => {
    let stopped = false;
    let timer: number | undefined;
    let fastPolls = 0;

    const tick = async (isFirst: boolean) => {
      let nextDelay = SLOW_POLL_MS;
      try {
        // rev param: distinct cache key — an early release let the CDN cache
        // this endpoint for an hour; the bare URL may still serve that stale copy.
        const data = await (await fetch("/api/videos?rev=2")).json();
        const incoming: VideoItem[] = data?.videos ?? [];
        if (stopped) return;
        if (incoming.length > 0) {
          if (feedChanged(videosRef.current, incoming)) applyVideos(incoming);
          const incomplete = incoming.some((v) => !v.storyboard);
          if (incomplete && fastPolls < MAX_FAST_POLLS) {
            fastPolls++;
            nextDelay = FAST_POLL_MS;
          }
        } else if (isFirst) {
          setFailed(true);
          return;
        }
      } catch {
        if (isFirst) {
          setFailed(true);
          return;
        }
      }
      timer = window.setTimeout(() => tick(false), nextDelay);
    };

    tick(true);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [applyVideos]);

  const handleTakeoff = useCallback((video: VideoItem) => {
    setActive(video);
    setPhase("flying");
  }, []);

  const handleArrived = useCallback(() => setPhase("playing"), []);

  const handleLanded = useCallback(() => {
    setActive(null);
    setPhase("idle");
    if (pendingVideosRef.current) {
      setVideos(pendingVideosRef.current);
      pendingVideosRef.current = null;
    }
  }, []);

  const close = useCallback(() => {
    setPhase((current) => {
      if (current !== "playing") return current;
      // Fade the player out, then fly the tile back into the ball.
      window.setTimeout(() => sceneApi.current?.flyBack(), 240);
      return "closing";
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (threadOpen) setThreadOpen(false);
      else close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, threadOpen]);

  // Current member (drives the log-in / log-out chip).
  useEffect(() => {
    fetch("/api/thread")
      .then((r) => r.json())
      .then((d) => setMe(d?.me ?? null))
      .catch(() => {});
  }, []);

  if (failed) {
    return (
      <div className="disco-status">
        <p>The mirror ball lost its playlist. Try refreshing.</p>
      </div>
    );
  }

  if (!videos) {
    return (
      <div className="disco-status">
        <div className="disco-loader" />
        <p>warming up the mirror ball…</p>
      </div>
    );
  }

  return (
    <div className="disco-stage">
      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: false, powerPreference: "high-performance" }}
        camera={{ fov: 42, position: [0, 0.15, 11], near: 0.1, far: 50 }}
      >
        <Suspense fallback={null}>
          <DiscoScene
            videos={videos}
            interactive={phase === "idle"}
            apiRef={sceneApi}
            onTakeoff={handleTakeoff}
            onArrived={handleArrived}
            onLanded={handleLanded}
          />
        </Suspense>
      </Canvas>

      <header className={`disco-header ${phase === "idle" ? "" : "hidden"}`}>
        <h1>MUSIC TRAFFICKER</h1>
        <p>a spinning ball of songs — click a window to play</p>
      </header>

      <div className={`disco-auth ${phase === "idle" ? "" : "hidden"}`}>
        {me ? (
          <LogoutForm name={me.name} />
        ) : (
          <LoginLink label="Log in" />
        )}
      </div>

      <button
        className={`thread-open ${phase === "idle" ? "" : "hidden"}`}
        onClick={() => setThreadOpen(true)}
      >
        What do you think of AI music?
      </button>

      {threadOpen && <ThreadPopup onClose={() => setThreadOpen(false)} />}

      {active && (phase === "playing" || phase === "closing") && (
        <div className={`disco-player ${phase === "playing" ? "visible" : ""}`}>
          <iframe
            src={`https://www.youtube.com/embed/${active.id}?autoplay=1&start=0&rel=0&playsinline=1`}
            title={active.title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          />
          <div className="disco-player-title">{active.title}</div>
          <button className="disco-close" onClick={close} aria-label="Back to the disco ball">
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
