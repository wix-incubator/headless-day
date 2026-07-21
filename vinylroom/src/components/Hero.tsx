"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
  useReducedMotion,
} from "framer-motion";
import AlbumArt from "./AlbumArt";
import VinylDisc from "./VinylDisc";
import Waveform from "./Waveform";
import MagneticButton from "./MagneticButton";
import { useBooking } from "./booking/BookingProvider";
import { usePlayer } from "./player/PlayerProvider";
import { artworkVariant } from "@/lib/artwork";
import { ScratchAudioEngine } from "@/lib/scratchAudio";
import { featuredEvent, stats, type Room } from "@/data/rooms";

const SCRATCH_SRC = "/audio/freesound_community-babyscratch-87371.mp3";
const DJ_VIDEO_WEBM_SRC = "/assets/video/dj-hologram.webm";
const DJ_VIDEO_MP4_SRC = "/assets/video/dj-hologram.mp4";
const RITUAL_STEPS = [
  { label: "Sleeve", note: "choose the room" },
  { label: "Reveal", note: "record slides out" },
  { label: "Needle", note: "rooms come alive" },
];

const PROJECTION_TARGETS = [
  [0.58, 0.18],
  [0.72, 0.28],
  [0.83, 0.42],
  [0.88, 0.56],
  [0.82, 0.68],
  [0.72, 0.78],
  [0.6, 0.86],
] as const;

type ProjectionGeometry = {
  sourceX: number;
  sourceY: number;
  beamLength: number;
  beamAngle: number;
  beamSpread: number;
  rays: Array<{ length: number; angle: number }>;
};

export default function Hero({ rooms }: { rooms?: Room[] }) {
  const ref = useRef<HTMLElement>(null);
  const scratchAudio = useMemo(() => new ScratchAudioEngine(SCRATCH_SRC), []);
  const stageRect = useRef<DOMRect | null>(null);
  const lastPointerY = useRef(0);
  const lastAt = useRef(0);
  const djModeRef = useRef(false);
  const scratchingRef = useRef(false);
  const resumePlayerAfterScratch = useRef(false);
  const scratchCleanup = useRef<(() => void) | null>(null);
  const djVideoRef = useRef<HTMLVideoElement>(null);
  const djVideoFallbackTried = useRef(false);
  const djMediaPrepared = useRef(false);
  const staticMobileDjRef = useRef(false);
  const scratchSurfaceRef = useRef<HTMLDivElement>(null);
  const djProjectorRef = useRef<HTMLDivElement>(null);
  const projectionEmitterRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { open } = useBooking();
  const player = usePlayer();
  const [djMode, setDjMode] = useState(false);
  const [scratching, setScratching] = useState(false);
  const [scratchRotation, setScratchRotation] = useState(0);
  const [isDesktop, setIsDesktop] = useState(false);
  const [staticMobileDj, setStaticMobileDj] = useState(false);
  const [djMediaResolved, setDjMediaResolved] = useState(false);
  const [djVideoReady, setDjVideoReady] = useState(false);
  const [djVideoFailed, setDjVideoFailed] = useState(false);
  const [projectionGeometry, setProjectionGeometry] = useState<ProjectionGeometry | null>(null);

  // Prefer the live (Wix-merged) room so "Reserve" actually reaches real
  // checkout — the static `featuredEvent` import never has a wixEventId.
  const featured = rooms?.find((r) => r.id === featuredEvent.id) ?? featuredEvent;
  const activeTrack = player.current;
  const stageTitle = activeTrack ? activeTrack.track : featured.title;
  const stageSubtitle = activeTrack ? activeTrack.artist : `${featured.dateLabel ?? featured.day} · ${featured.time}`;
  const stageLocation = activeTrack?.city ?? featured.city;
  const stageAccent = activeTrack?.accent ?? featured.sleeve.accent;
  const stageLabel = activeTrack ? "Now playing" : "Now spinning";
  const activeArtwork = artworkVariant(activeTrack?.artwork, 360);
  // Phones keep their existing animated WebP path. Desktop shows only the
  // full-quality video, and only after the browser has decoded a real frame.
  // This removes the double-silhouette startup layer without adding work to
  // the critical first paint.
  const desktopDjReady = !staticMobileDj && djMediaResolved && djVideoReady && !djVideoFailed;
  const djVisualActive = djMode && (staticMobileDj || desktopDjReady);

  useLayoutEffect(() => {
    if (!djVisualActive) return;

    const surface = scratchSurfaceRef.current;
    const projector = djProjectorRef.current;
    const emitter = projectionEmitterRef.current;
    if (!surface || !projector || !emitter) return;

    let frame = 0;
    const updateGeometry = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        // The emitter is translated by -50%, so its CSS offset is already its
        // visual centre in the scratch-surface coordinate system.
        const sourceX = emitter.offsetLeft;
        const sourceY = emitter.offsetTop;
        const projectorX = projector.offsetLeft;
        const projectorY = projector.offsetTop;
        const projectorWidth = projector.offsetWidth;
        const projectorHeight = projector.offsetHeight;

        const rays = PROJECTION_TARGETS.map(([xRatio, yRatio]) => {
          const targetX = projectorX + projectorWidth * xRatio;
          const targetY = projectorY + projectorHeight * yRatio;
          const deltaX = targetX - sourceX;
          const deltaY = targetY - sourceY;
          return {
            length: Math.hypot(deltaX, deltaY),
            angle: (Math.atan2(deltaY, deltaX) * 180) / Math.PI,
          };
        });

        const beamTargetX = projectorX + projectorWidth * 0.78;
        const beamTargetY = projectorY + projectorHeight * 0.56;
        const beamDeltaX = beamTargetX - sourceX;
        const beamDeltaY = beamTargetY - sourceY;

        setProjectionGeometry({
          sourceX,
          sourceY,
          beamLength: Math.hypot(beamDeltaX, beamDeltaY),
          beamAngle: (Math.atan2(beamDeltaY, beamDeltaX) * 180) / Math.PI,
          beamSpread: projectorHeight * 0.78,
          rays,
        });
      });
    };

    updateGeometry();
    const observer = new ResizeObserver(updateGeometry);
    observer.observe(surface);
    observer.observe(projector);
    window.addEventListener("resize", updateGeometry);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", updateGeometry);
    };
  }, [djVisualActive, isDesktop, staticMobileDj]);

  useEffect(() => {
    djModeRef.current = djMode;
  }, [djMode]);

  useEffect(() => () => scratchAudio.stop(), [scratchAudio]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 640px)");
    const update = () => setIsDesktop(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => () => scratchCleanup.current?.(), []);

  const onDjMetadataLoaded = useCallback(() => {
    const djVideo = djVideoRef.current;
    if (!djVideo) return;

    if (!djModeRef.current || reduce) djVideo.pause();
    // Reduced-motion users see one representative frame, without scrubbing.
    if (reduce && djVideo.duration) {
      djVideo.currentTime = djVideo.duration * 0.16;
      setDjVideoReady(true);
    }
    setDjVideoFailed(false);
  }, [reduce]);

  const prepareDjVideo = useCallback(() => {
    const djVideo = djVideoRef.current;
    if (!djVideo || staticMobileDjRef.current || djMediaPrepared.current) return;

    const supportsWebm = djVideo.canPlayType('video/webm; codecs="vp9"') !== "";
    djVideoFallbackTried.current = !supportsWebm;
    setDjVideoReady(false);
    setDjVideoFailed(false);
    djVideo.src = supportsWebm ? DJ_VIDEO_WEBM_SRC : DJ_VIDEO_MP4_SRC;
    djVideo.preload = "auto";
    djMediaPrepared.current = true;
    djVideo.load();
  }, []);

  useEffect(() => {
    const djVideo = djVideoRef.current;
    if (!djVideo) return;

    const handleError = () => {
      if (
        !djVideoFallbackTried.current &&
        djVideo.currentSrc.endsWith(DJ_VIDEO_WEBM_SRC)
      ) {
        djVideoFallbackTried.current = true;
        setDjVideoReady(false);
        djVideo.src = DJ_VIDEO_MP4_SRC;
        djVideo.load();
        return;
      }
      setDjVideoReady(false);
      setDjVideoFailed(true);
    };

    const handleCanPlay = () => {
      setDjVideoFailed(false);
      setDjVideoReady(true);
      if (djModeRef.current && !reduce && !staticMobileDjRef.current) {
        void djVideo.play().catch(() => {});
      }
    };

    const handleLoadedData = () => {
      setDjVideoReady(true);
      setDjVideoFailed(false);
    };

    const handlePlaying = () => {
      setDjVideoReady(true);
      setDjVideoFailed(false);
    };

    djVideo.addEventListener("loadedmetadata", onDjMetadataLoaded);
    djVideo.addEventListener("loadeddata", handleLoadedData);
    djVideo.addEventListener("canplay", handleCanPlay);
    djVideo.addEventListener("playing", handlePlaying);
    djVideo.addEventListener("error", handleError);

    const appleMobileWebKit =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const useStaticMobileDj = window.matchMedia("(max-width: 767px)").matches || appleMobileWebKit;
    staticMobileDjRef.current = useStaticMobileDj;
    setStaticMobileDj(useStaticMobileDj);
    setDjMediaResolved(true);

    if (useStaticMobileDj) {
      // Phone video compositing has been unreliable. Use the lighter animated
      // WebP hologram and projection treatment instead of decoding the video.
      djVideo.pause();
    }

    return () => {
      djVideo.removeEventListener("loadedmetadata", onDjMetadataLoaded);
      djVideo.removeEventListener("loadeddata", handleLoadedData);
      djVideo.removeEventListener("canplay", handleCanPlay);
      djVideo.removeEventListener("playing", handlePlaying);
      djVideo.removeEventListener("error", handleError);
    };
  }, [onDjMetadataLoaded, reduce]);

  // Warm the 750 KB full-quality loop shortly after hydration. This request
  // is not part of the document's critical render path, but it normally
  // finishes well before a visitor reaches for DJ mode. Clicking still calls
  // `prepareDjVideo` immediately as a fallback.
  useEffect(() => {
    if (!djMediaResolved || staticMobileDj || reduce) return;

    const timeout = window.setTimeout(prepareDjVideo, 450);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [djMediaResolved, prepareDjVideo, reduce, staticMobileDj]);

  useEffect(() => {
    const djVideo = djVideoRef.current;
    if (!djVideo || djVideoFailed) return;

    if (staticMobileDj) {
      djVideo.pause();
      return;
    }

    if (!djMode) {
      djVideo.pause();
      if (djVideo.readyState >= HTMLMediaElement.HAVE_METADATA) djVideo.currentTime = 0;
      return;
    }

    if (reduce) {
      djVideo.pause();
      if (djVideo.duration) djVideo.currentTime = djVideo.duration * 0.16;
      return;
    }

    if (djVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) void djVideo.play().catch(() => {
      // Muted inline playback should be allowed; if a browser declines it,
      // keep the loaded frame visible and retry on the next mode activation.
    });
  }, [djMode, djVideoFailed, djVideoReady, reduce, staticMobileDj]);

  const toggleDjMode = () => {
    const next = !djMode;
    const djVideo = djVideoRef.current;
    if (next) prepareDjVideo();
    djModeRef.current = next;
    setDjMode(next);

    if (
      next &&
      djVideo &&
      djVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
      !djVideoFailed &&
      !reduce &&
      !staticMobileDj
    ) {
      void djVideo?.play().catch(() => {});
    }

    if (!next) {
      djVideo?.pause();
      if (djVideo && djVideo.readyState >= HTMLMediaElement.HAVE_METADATA) {
        djVideo.currentTime = 0;
      }
      stopScratch();
      scratchAudio.stop();
    }
  };

  const scratchAt = (clientY: number) => {
    if (!scratchingRef.current) return;
    const now = performance.now();
    const distance = clientY - lastPointerY.current;
    const elapsed = Math.max(now - lastAt.current, 16);
    const speed = Math.min((Math.abs(distance) / elapsed) * 1.5, 1.7);
    setScratchRotation((rotationDegrees) => rotationDegrees + distance * 1.8);
    lastPointerY.current = clientY;
    lastAt.current = now;

    if (Math.abs(distance) < 0.85) return;
    void scratchAudio.play(distance, elapsed, Math.min(0.24 + speed * 0.46, 0.8));
  };

  const stopScratch = () => {
    const wasScratching = scratchingRef.current;
    scratchingRef.current = false;
    scratchCleanup.current?.();
    scratchCleanup.current = null;
    setScratching(false);
    scratchAudio.stop();

    if (wasScratching && resumePlayerAfterScratch.current) {
      player.resume();
    }
    resumePlayerAfterScratch.current = false;
  };

  const startScratch = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!djModeRef.current) {
      prepareDjVideo();
      djModeRef.current = true;
      setDjMode(true);
      if (
        djVideoRef.current &&
        djVideoRef.current.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        !djVideoFailed &&
        !reduce &&
        !staticMobileDj
      ) {
        void djVideoRef.current?.play().catch(() => {});
      }
    }

    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Safari can reject pointer capture during a rapid touch transition.
    }
    scratchingRef.current = true;
    setScratching(true);
    lastPointerY.current = e.clientY;
    lastAt.current = performance.now();
    resumePlayerAfterScratch.current = player.playing;
    if (player.playing) player.stop();
    void scratchAudio.arm();

    const pointerId = e.pointerId;
    const onMove = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return;
      event.preventDefault();
      scratchAt(event.clientY);
    };
    const onEnd = (event: PointerEvent) => {
      if (event.pointerId === pointerId) stopScratch();
    };
    scratchCleanup.current?.();
    scratchCleanup.current = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
      window.removeEventListener("pointercancel", onEnd);
    };
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onEnd);
    window.addEventListener("pointercancel", onEnd);
  };

  const { scrollYProgress } = useScroll({
    target: isDesktop ? ref : undefined,
    // The hero is pinned on desktop. Map the choreography to that pinned
    // interval, rather than to the point after the section has left view.
    offset: ["start start", "end end"],
  });
  const yVinyl = useTransform(scrollYProgress, [0, 0.65, 1], [0, reduce ? 0 : 76, reduce ? 0 : 122]);
  const xVinyl = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -18]);
  const vinylScale = useTransform(scrollYProgress, [0, 0.72, 1], [1, reduce ? 1 : 1.12, reduce ? 1 : 1.22]);
  const yCover = useTransform(scrollYProgress, [0, 0.65, 1], [0, reduce ? 0 : -92, reduce ? 0 : -150]);
  const xCover = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -78]);
  const coverOpacity = useTransform(scrollYProgress, [0, 0.66, 1], [1, 1, reduce ? 1 : 0.14]);
  const yCard = useTransform(scrollYProgress, [0, 0.65, 1], [0, reduce ? 0 : 24, reduce ? 0 : 54]);
  const xCard = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 84]);
  const cardOpacity = useTransform(scrollYProgress, [0, 0.78, 1], [1, 1, reduce ? 1 : 0.38]);
  const copyY = useTransform(scrollYProgress, [0, 0.8, 1], [0, reduce ? 0 : -26, reduce ? 0 : -46]);
  const opacity = useTransform(scrollYProgress, [0, 0.72, 1], [1, reduce ? 1 : 0.76, reduce ? 1 : 0.08]);
  const stageScale = useTransform(scrollYProgress, [0, 0.7, 1], [1, reduce ? 1 : 1.02, reduce ? 1 : 1.05]);
  const cueArmRotate = useTransform(scrollYProgress, [0, 0.72, 1], [-8, reduce ? -8 : 16, reduce ? -8 : 23]);
  const cueArmY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 74]);
  const signalOpacity = useTransform(scrollYProgress, [0, 0.16, 0.8, 1], [0.15, 1, 0.7, 0]);
  const needleCaptionOpacity = useTransform(scrollYProgress, [0, 0.68, 0.9, 1], [0, 0, 1, reduce ? 1 : 0.1]);
  const sleeveStep = useTransform(scrollYProgress, [0, 0.22, 0.34], [1, 1, 0.35]);
  const revealStep = useTransform(scrollYProgress, [0.18, 0.42, 0.68], [0.35, 1, 0.45]);
  const needleStep = useTransform(scrollYProgress, [0.58, 0.82, 1], [0.35, 1, reduce ? 1 : 0.45]);
  const ritualProgress = useTransform(scrollYProgress, [0.05, 0.92], ["6%", "100%"]);
  const stepOpacities = [sleeveStep, revealStep, needleStep];

  // mouse-driven depth tilt for the whole stage
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [8, -8]), { stiffness: 120, damping: 18 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-10, 10]), { stiffness: 120, damping: 18 });

  const onMove = (e: React.MouseEvent) => {
    if (reduce || !stageRect.current) return;
    const r = stageRect.current;
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onEnter = (e: React.MouseEvent) => {
    stageRect.current = e.currentTarget.getBoundingClientRect();
  };
  const onLeave = () => {
    stageRect.current = null;
    mx.set(0);
    my.set(0);
  };

  return (
    <section ref={ref} id="top" className="relative min-h-[100svh] overflow-hidden lg:min-h-[150svh]">
      <div className="mx-auto grid min-h-[100svh] max-w-[100rem] grid-cols-1 items-center gap-10 px-5 pb-14 pt-28 sm:gap-12 sm:px-8 sm:pb-16 sm:pt-32 lg:sticky lg:top-0 lg:grid-cols-[0.9fr_1.1fr] lg:gap-6 lg:pt-28">
        {/* ── Copy ── */}
        <motion.div style={{ opacity: isDesktop ? opacity : 1, y: isDesktop ? copyY : 0 }} className="relative z-10 max-w-xl">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="mb-5 inline-flex max-w-full items-center gap-2 rounded-full border border-edge bg-pitch/70 px-3 py-1.5 sm:mb-6 sm:bg-pitch/40 sm:backdrop-blur-sm"
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber" />
            <span className="truncate text-[0.58rem] uppercase tracking-[0.2em] text-beige sm:text-[0.65rem] sm:tracking-[0.28em]">
              A room. A record. People who listen.
            </span>
          </motion.div>

          <h1 className="font-display text-[clamp(2.45rem,10.6vw,2.85rem)] leading-[0.96] text-cream sm:hidden">
            Host
            <br />
            unforgettable
            <br />
            <span className="relative inline-block italic">
              nights
              <span className="absolute -bottom-1 left-0 h-px w-full bg-gradient-to-r from-amber/70 to-transparent" />
            </span>
            <br />
            around the
            <br />
            records
            <br />
            you love.
          </h1>

          <h1 className="hidden text-balance font-display text-[clamp(2.7rem,6.5vw,5.2rem)] leading-[0.95] text-cream sm:block">
            Host unforgettable{" "}
            <span className="relative inline-block italic">
              nights
              <span className="absolute -bottom-1 left-0 h-px w-full bg-gradient-to-r from-amber/70 to-transparent" />
            </span>{" "}
            around the records you love.
          </h1>

          <p className="mt-6 max-w-[22rem] text-base leading-relaxed text-parchment sm:mt-7 sm:max-w-md sm:text-lg">
            Create intimate vinyl listening sessions, invite real music lovers, and
            turn your collection into a shared evening.
          </p>

          <div className="mt-7 rounded-2xl border border-edge bg-pitch/55 p-3 sm:hidden">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[0.58rem] uppercase tracking-[0.22em] text-amber">
                Listening ritual
              </span>
              <span className="font-mono text-[0.54rem] uppercase tracking-[0.12em] text-dust">
                3 beats
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {RITUAL_STEPS.map((step, index) => (
                <motion.div
                  key={step.label}
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, delay: 0.12 + index * 0.08 }}
                  className="rounded-xl border border-edge bg-void/40 px-2 py-2"
                >
                  <div className="text-[0.54rem] uppercase tracking-[0.18em] text-amber">0{index + 1}</div>
                  <div className="mt-1 font-display text-base leading-none text-cream">{step.label}</div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="mt-7 hidden max-w-md rounded-2xl border border-edge bg-pitch/45 p-3 sm:block">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[0.62rem] uppercase tracking-[0.24em] text-amber">
                Needle-drop journey
              </span>
              <span className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-dust">
                scroll controls pace
              </span>
            </div>
            <div className="relative mb-3 h-1 overflow-hidden rounded-full bg-edge">
              <motion.span
                aria-hidden="true"
                style={{ width: ritualProgress }}
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber via-cream to-burnt"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {RITUAL_STEPS.map((step, i) => (
                <motion.div
                  key={step.label}
                  style={{ opacity: stepOpacities[i] }}
                  className="rounded-xl border border-edge bg-void/35 px-3 py-2"
                >
                  <div className="font-display text-lg leading-none text-cream">{step.label}</div>
                  <div className="mt-1 text-[0.62rem] text-dust">{step.note}</div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="mt-8 flex flex-col items-start gap-3 sm:mt-9 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            <MagneticButton href="#host">Create a listening room →</MagneticButton>
            <MagneticButton href="#rooms" variant="ghost">
              Explore upcoming nights
            </MagneticButton>
          </div>

          {/* trust strip */}
          <div className="mt-9 grid grid-cols-3 gap-3 border-t border-edge pt-5 sm:mt-12 sm:flex sm:flex-wrap sm:gap-x-8 sm:gap-y-4 sm:pt-6">
            {stats.map((s) => (
              <div key={s.label}>
                <div className="font-display text-xl text-cream sm:text-2xl">{s.value}</div>
                <div className="text-[0.54rem] uppercase tracking-[0.12em] text-dust sm:text-[0.7rem] sm:tracking-[0.18em]">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Visual stage ── */}
        <div
          className={`ritual-stage hologram-stage relative flex items-center justify-center pb-28 sm:pb-0 lg:-translate-x-8 lg:pb-32 [perspective:1400px] ${djMode ? "dj-active" : ""} ${djVisualActive ? "dj-rendering" : ""}`}
          onMouseEnter={onEnter}
          onMouseMove={onMove}
          onMouseLeave={onLeave}
        >
          <motion.div
            ref={scratchSurfaceRef}
            style={{
              rotateX: isDesktop ? rx : 0,
              rotateY: isDesktop ? ry : 0,
              scale: isDesktop ? stageScale : 1,
              transformStyle: "preserve-3d",
              willChange: isDesktop ? "transform" : "auto",
            }}
            className="scratch-surface relative aspect-[0.88] w-full max-w-[22rem] sm:aspect-square sm:max-w-[26rem] lg:max-w-[34rem]"
          >
            {/* warm halo */}
            <div className="pointer-events-none absolute inset-[-10%] rounded-full bg-[radial-gradient(circle,rgba(226,165,82,0.18),transparent_62%)] blur-xl sm:inset-[-18%] sm:bg-[radial-gradient(circle,rgba(226,165,82,0.3),transparent_60%)] sm:blur-2xl" />
            <div className="pointer-events-none absolute inset-[16%] rounded-full border border-amber/10 opacity-70 [mask-image:linear-gradient(90deg,transparent,black,transparent)] sm:inset-[8%]" />

            <div
              ref={djProjectorRef}
              className={`dj-hologram-projector ${djVisualActive ? "is-active" : ""} ${staticMobileDj ? "is-static-mobile" : ""}`}
              aria-hidden="true"
            >
              <video
                ref={djVideoRef}
                id="djHologram"
                className="dj-hologram dj-hologram-main"
                muted
                playsInline
                loop
                preload="none"
                poster="/assets/video/dj-hologram-poster.webp"
                tabIndex={-1}
              />
              {/* Image animation avoids the unstable mobile video compositor. */}
              {djVisualActive && staticMobileDj ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/assets/video/dj-hologram-mobile.webp"
                    alt=""
                    width={216}
                    height={324}
                    draggable={false}
                    decoding="async"
                    loading="eager"
                    fetchPriority="low"
                    className="dj-hologram-mobile-animation"
                  />
                </>
              ) : null}
            </div>

            <div
              className={`dj-projection-rays ${djVisualActive && projectionGeometry ? "is-active" : ""}`}
              aria-hidden="true"
            >
              {projectionGeometry?.rays.map((ray, index) => (
                <span
                  key={index}
                  style={
                    {
                      "--ray-x": `${projectionGeometry.sourceX}px`,
                      "--ray-y": `${projectionGeometry.sourceY}px`,
                      "--ray-length": `${ray.length}px`,
                      "--ray-angle": `${ray.angle}deg`,
                    } as CSSProperties
                  }
                />
              ))}
            </div>

            {/* The scene's quiet technical layer gives the record a sense of place. */}
            <motion.div
              style={{ opacity: signalOpacity, translateZ: 10 }}
              className="pointer-events-none absolute -left-[13%] top-[18%] hidden w-[8.75rem] text-[0.55rem] uppercase tracking-[0.22em] text-beige/75 lg:block"
            >
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber shadow-[0_0_10px_rgba(226,165,82,0.9)]" />
                <span>Side A / 33 1/3</span>
              </div>
              <div className="mt-3 h-px w-full bg-edge" />
              <div className="mt-2 flex items-center justify-between font-mono text-[0.48rem] tracking-[0.12em] text-dust/65">
                <span>ROOM 08</span>
                <span>LIVE</span>
              </div>
            </motion.div>

            <motion.div
              style={{ opacity: signalOpacity, translateZ: 20 }}
              className="pointer-events-none absolute -right-[12%] bottom-[18%] hidden w-[9.5rem] lg:block"
            >
              <div className="flex items-end gap-3 border-b border-edge pb-2">
                <Waveform bars={8} className="h-4 w-10" color="var(--color-amber)" playing={!reduce} />
                <span className="pb-0.5 text-[0.5rem] uppercase tracking-[0.22em] text-beige/70">Listening signal</span>
              </div>
              <p className="mt-2 font-mono text-[0.48rem] uppercase tracking-[0.12em] text-dust/55">
                Needle down / room tone
              </p>
            </motion.div>

            {/* A small cue arm makes the stage read as a turntable, not a floating card. */}
            <motion.div
              style={{ rotate: cueArmRotate, y: cueArmY, translateZ: 60 }}
              className="pointer-events-none absolute right-[-6%] top-[5%] z-20 hidden h-[42%] w-[20%] origin-[88%_8%] lg:block"
            >
              <div className="absolute right-[10%] top-[7%] h-[5px] w-[5px] rounded-full bg-cream shadow-[0_0_12px_rgba(248,240,221,0.65)]" />
              <div className="absolute right-[11%] top-[9%] h-[2px] w-[84%] origin-right rotate-[128deg] bg-gradient-to-l from-cream/90 via-beige/60 to-transparent shadow-[0_1px_4px_rgba(0,0,0,0.8)]" />
              <div className="absolute bottom-[8%] left-[1%] h-4 w-7 -rotate-[38deg] rounded-sm border border-beige/50 bg-pitch/90 shadow-[0_5px_12px_rgba(0,0,0,0.45)]" />
              <div className="absolute bottom-[4%] left-[-2%] h-2 w-2 rounded-full bg-amber shadow-[0_0_16px_rgba(226,165,82,0.9)]" />
            </motion.div>

            <div className="pointer-events-none absolute left-[20%] top-[14%] hidden h-1.5 w-1.5 animate-pulse rounded-full bg-cream/70 shadow-[0_0_12px_rgba(248,240,221,0.75)] lg:block" />
            <div className="pointer-events-none absolute bottom-[31%] left-[9%] hidden h-px w-[18%] bg-amber/35 lg:block" />

            {/* vinyl sliding out behind the sleeve */}
            <motion.div
              style={{
                x: isDesktop ? xVinyl : 0,
                y: isDesktop ? yVinyl : 0,
                scale: isDesktop ? vinylScale : 1,
                translateZ: -40,
                willChange: isDesktop ? "transform" : "auto",
              }}
              className="absolute right-[-1%] top-[17%] w-[66%] sm:right-[-7%] sm:top-[11%] sm:w-[76%]"
            >
              <div className="pointer-events-none absolute inset-[6%] hidden rounded-full bg-[radial-gradient(circle,rgba(244,232,208,0.2),transparent_65%)] blur-xl sm:block" />
              <div
                aria-hidden="true"
                className="pointer-events-none relative block w-full rounded-full"
                style={{
                  transform: `rotate(${scratchRotation}deg)`,
                  animation: !scratching ? "spin-slow 10s linear infinite" : undefined,
                }}
              >
                <VinylDisc label={activeTrack ? activeTrack.track : "Kind of Blue"} accent={stageAccent} spinning={false} className="w-full" />
                <span
                  className={`pointer-events-none absolute inset-[-5%] rounded-full border transition-[opacity,transform,box-shadow] duration-200 ${
                    scratching ? "scale-[1.035] opacity-100" : djMode ? "opacity-70" : "opacity-0"
                  }`}
                  style={{
                    borderColor: stageAccent,
                    boxShadow: scratching
                      ? `0 0 52px -5px ${stageAccent}, inset 0 0 24px -12px ${stageAccent}`
                      : `0 0 36px -8px ${stageAccent}`,
                  }}
                />
              </div>
            </motion.div>

            {/* album sleeve in front */}
            <motion.div
              style={{
                x: isDesktop ? xCover : 0,
                y: isDesktop ? yCover : 0,
                opacity: isDesktop ? coverOpacity : 1,
                translateZ: 40,
                willChange: isDesktop ? "transform, opacity" : "auto",
              }}
              className="pointer-events-none absolute left-[2%] top-[5%] w-[68%] rounded-[4px] shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)] sm:left-[3%] sm:top-[2%] sm:w-[70%] sm:shadow-[0_50px_100px_-30px_rgba(0,0,0,0.85)]"
            >
              {activeArtwork ? (
                <div className="relative aspect-square w-full overflow-hidden rounded-[3px] bg-charcoal">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={activeArtwork}
                    alt=""
                    width={360}
                    height={360}
                    draggable={false}
                    decoding="async"
                    loading="eager"
                    fetchPriority="high"
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <AlbumArt
                  sleeve={featured.sleeve}
                  label={featured.title}
                  sub={`${featured.genre} · ${featured.city}`}
                />
              )}
            </motion.div>

            <div
              className={`dj-projection-beam ${djVisualActive && projectionGeometry ? "is-active" : ""}`}
              style={
                projectionGeometry
                  ? ({
                      "--beam-x": `${projectionGeometry.sourceX}px`,
                      "--beam-y": `${projectionGeometry.sourceY}px`,
                      "--beam-length": `${projectionGeometry.beamLength}px`,
                      "--beam-angle": `${projectionGeometry.beamAngle}deg`,
                      "--beam-spread": `${projectionGeometry.beamSpread}px`,
                    } as CSSProperties)
                  : undefined
              }
              aria-hidden="true"
            />

            <button
              type="button"
              aria-label="DJ scratch the hero record"
              aria-pressed={scratching}
              onPointerDown={startScratch}
              onPointerUp={stopScratch}
              onPointerCancel={stopScratch}
              onContextMenu={(e) => e.preventDefault()}
              className="absolute right-[0%] top-[16%] z-20 h-[56%] w-[47%] touch-none rounded-full outline-none focus-visible:ring-2 focus-visible:ring-amber/80 clickable sm:right-[0%] sm:top-[23%] sm:h-[42%] sm:w-[36%]"
            >
              <span className="sr-only">Press and drag the disc to scratch</span>
            </button>

            <div
              ref={projectionEmitterRef}
              className={`dj-projection-emitter ${djVisualActive ? "is-active" : ""}`}
              aria-hidden="true"
            />

            {/* floating booking card */}
            <motion.div
              style={{
                x: isDesktop ? xCard : 0,
                y: isDesktop ? yCard : 0,
                opacity: isDesktop ? cardOpacity : 1,
                translateZ: isDesktop ? 90 : 0,
                willChange: isDesktop ? "transform, opacity" : "auto",
              }}
              className="absolute left-[3%] top-[82%] w-[94%] max-w-none rounded-2xl p-4 glass glow-warm sm:left-auto sm:bottom-[-9%] sm:right-[1%] sm:top-auto sm:w-[60%] sm:max-w-[14.75rem] lg:bottom-[-14%] lg:right-[38%] lg:w-[55%]"
            >
              <div className="flex items-center justify-between gap-4">
                <span className="eyebrow text-[0.6rem]">{stageLabel}</span>
                <Waveform bars={4} className="h-3 w-5" color={stageAccent} playing={player.playing} />
              </div>
              <div className="mt-3 truncate font-display text-[1.05rem] leading-tight text-cream">
                {stageTitle}
              </div>
              <div className="mt-2 space-y-1 text-[0.72rem] leading-snug text-parchment">
                <div className="truncate">{stageSubtitle}</div>
                <div className="flex items-center gap-2 text-dust">
                  <span className="h-1 w-1 rounded-full bg-dust" />
                  <span className="truncate">{stageLocation}</span>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-edge pt-3">
                <div>
                  <div className="text-sm font-medium text-cream">{featured.price}</div>
                  <div className="mt-0.5 text-[0.65rem] leading-none text-amber">
                    {featured.seatsLeft} of {featured.capacity} seats left
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => open(featured)}
                  className="shrink-0 rounded-full bg-cream px-3 py-1.5 text-xs font-medium text-void transition-transform hover:scale-105 clickable"
                >
                  Reserve
                </button>
              </div>
            </motion.div>

            <motion.div
              style={{ opacity: needleCaptionOpacity, translateZ: 100 }}
              className="pointer-events-none absolute bottom-[21%] left-[18%] hidden rounded-full border border-amber/45 bg-void/75 px-3 py-1.5 backdrop-blur-md lg:flex lg:items-center lg:gap-2"
            >
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber shadow-[0_0_12px_rgba(226,165,82,0.9)]" />
              <span className="text-[0.55rem] uppercase tracking-[0.2em] text-cream">Needle down · rooms appear</span>
            </motion.div>
          </motion.div>

          <div
            className={`dj-mode-control ${djMode ? "is-active" : "is-idle"} absolute z-[60] flex items-center gap-1.5 rounded-full border border-amber/50 bg-void/95 px-1.5 py-1.5 backdrop-blur-md`}
            onPointerEnter={prepareDjVideo}
          >
            <button
              type="button"
              onClick={toggleDjMode}
              onFocus={prepareDjVideo}
              aria-pressed={djMode}
              aria-label={djMode ? "Turn DJ mode off" : "Try DJ mode"}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.56rem] font-bold uppercase tracking-[0.16em] transition-colors clickable sm:px-3.5 sm:py-2 sm:text-[0.62rem] sm:tracking-[0.18em] ${
                djMode ? "bg-amber text-void" : "text-amber hover:bg-amber/10"
              }`}
            >
              {!djMode && <span className="dj-mode-spark" aria-hidden="true" />}
              {djMode ? "DJ mode" : "Try DJ mode"}
            </button>
            <span className="hidden whitespace-nowrap pr-2 text-[0.6rem] text-parchment md:inline">
              {scratching ? "Scratch audio live" : djMode ? "Drag disc · DJ keeps moving" : "Drag disc or turn on"}
            </span>
          </div>
        </div>
      </div>

      {/* scroll cue */}
      <motion.div
        style={{ opacity }}
        className="pointer-events-none absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 lg:flex"
      >
        <span className="text-[0.6rem] uppercase tracking-[0.3em] text-dust">Scroll</span>
        <div className="h-10 w-px bg-gradient-to-b from-beige/60 to-transparent" />
      </motion.div>
    </section>
  );
}
