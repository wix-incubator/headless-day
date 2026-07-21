"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import VinylDisc from "@/components/VinylDisc";
import { ScratchAudioEngine } from "@/lib/scratchAudio";

const SCRATCH_SRC = "/audio/freesound_community-babyscratch-87371.mp3";

function angleFromCenter(e: React.PointerEvent<HTMLButtonElement>, center: { x: number; y: number }) {
  const x = e.clientX - center.x;
  const y = e.clientY - center.y;
  return Math.atan2(y, x) * (180 / Math.PI);
}

function shortestDelta(next: number, prev: number) {
  let delta = next - prev;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return delta;
}

export default function ScratchableVinyl({
  accent,
  label,
  autoSpin,
}: {
  accent: string;
  label: string;
  autoSpin: boolean;
}) {
  const scratchAudio = useMemo(() => new ScratchAudioEngine(SCRATCH_SRC), []);
  const centerRef = useRef<{ x: number; y: number } | null>(null);
  const lastAngle = useRef(0);
  const lastAt = useRef(0);
  const settleTimer = useRef<number | null>(null);
  const djModeRef = useRef(false);
  const scratchingRef = useRef(false);
  const [djMode, setDjMode] = useState(false);
  const [scratching, setScratching] = useState(false);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    return () => {
      if (settleTimer.current) window.clearTimeout(settleTimer.current);
      scratchAudio.stop();
    };
  }, [scratchAudio]);

  useEffect(() => {
    scratchAudio.preload();
  }, [scratchAudio]);

  useEffect(() => {
    djModeRef.current = djMode;
  }, [djMode]);

  const pauseScratch = () => {
    if (settleTimer.current) window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(() => {
      if (scratchingRef.current) return;
      scratchAudio.stop();
    }, 160);
  };

  const armDjMode = () => {
    const next = !djMode;
    djModeRef.current = next;
    setDjMode(next);

    if (!next) {
      if (settleTimer.current) window.clearTimeout(settleTimer.current);
      scratchAudio.stop();
    }
  };

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Some mobile Safari builds reject capture during fast touch handoff.
    }
    const rect = e.currentTarget.getBoundingClientRect();
    centerRef.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    djModeRef.current = true;
    scratchingRef.current = true;
    setDjMode(true);
    setScratching(true);
    lastAngle.current = angleFromCenter(e, centerRef.current);
    lastAt.current = performance.now();
    void scratchAudio.arm();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!scratchingRef.current) return;

    if (!centerRef.current) return;
    const nextAngle = angleFromCenter(e, centerRef.current);
    const now = performance.now();
    const delta = shortestDelta(nextAngle, lastAngle.current);
    const elapsed = Math.max(now - lastAt.current, 16);
    const speed = Math.min(Math.abs(delta) / elapsed, 1.6);

    setRotation((r) => r + delta);
    lastAngle.current = nextAngle;
    lastAt.current = now;

    if (Math.abs(delta) < 0.75) return;
    void scratchAudio.play(delta, elapsed, Math.min(0.24 + speed * 0.46, 0.78));
  };

  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    scratchingRef.current = false;
    setScratching(false);
    centerRef.current = null;
    pauseScratch();
  };

  return (
    <div className="relative mx-auto mb-14 h-36 w-36 sm:mb-16 sm:h-44 sm:w-44">
      <div className="absolute inset-[-18%] rounded-full bg-[radial-gradient(circle,rgba(216,154,69,0.16),transparent_62%)] blur-xl sm:inset-[-30%] sm:bg-[radial-gradient(circle,rgba(216,154,69,0.25),transparent_60%)] sm:blur-2xl" />
      <div className="pointer-events-none absolute -inset-4 rounded-full border border-amber/25 shadow-[0_0_38px_-10px_rgba(216,154,69,0.95)]" />

      <button
        type="button"
        aria-label="Scratch the record"
        aria-pressed={scratching}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative block h-full w-full touch-none rounded-full outline-none transition-transform duration-200 focus-visible:ring-2 focus-visible:ring-amber/70"
        style={{
          transform: `rotate(${rotation}deg)`,
          animation: autoSpin && !scratching ? "spin-slow 6s linear infinite" : undefined,
        }}
      >
        <VinylDisc accent={accent} spinning={false} label={label} className="h-full w-full" />
        <span
          className={`pointer-events-none absolute inset-[-10%] rounded-full border transition-opacity ${
            scratching ? "opacity-100" : "opacity-0"
          }`}
          style={{ borderColor: accent, boxShadow: `0 0 34px -10px ${accent}` }}
        />
      </button>

      <div className="pointer-events-none absolute -right-3 top-2 h-24 w-20 origin-top-left rotate-[28deg] sm:-right-5 sm:h-28">
        <div className="absolute left-8 top-0 h-20 w-1 rounded-full bg-cream/70 shadow-[0_0_18px_rgba(244,232,208,0.25)]" />
        <div className="absolute left-6 top-[4.6rem] h-5 w-7 rounded-full border border-edge bg-charcoal" />
      </div>

      <div className="pointer-events-none absolute -right-28 top-3 hidden w-28 -rotate-12 sm:block">
        <div className="mb-1 rounded-full border border-amber/40 bg-void/75 px-3 py-1 text-center text-[0.6rem] font-medium uppercase tracking-[0.18em] text-amber shadow-[0_0_26px_-8px_rgba(216,154,69,0.95)] sm:backdrop-blur-md">
          Scratch it
        </div>
        <div className="relative ml-1 h-10">
          <span className="absolute left-0 top-5 h-1 w-20 origin-left rotate-[155deg] rounded-full bg-amber shadow-[0_0_18px_rgba(216,154,69,0.9)]" />
          <span className="absolute left-[0.4rem] top-[1.15rem] h-4 w-4 rotate-45 border-b-4 border-l-4 border-amber shadow-[0_0_14px_rgba(216,154,69,0.85)]" />
        </div>
      </div>

      <div className="absolute -bottom-10 left-1/2 flex w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-1.5 rounded-full border border-amber/35 bg-void/90 px-2 py-1.5 shadow-[0_0_24px_-12px_rgba(216,154,69,0.95)] sm:gap-2 sm:bg-void/85 sm:backdrop-blur-md">
        <button
          type="button"
          onClick={armDjMode}
          className={`rounded-full px-3 py-2 text-[0.58rem] font-semibold uppercase tracking-[0.12em] transition-colors clickable sm:px-4 sm:text-[0.66rem] sm:tracking-[0.16em] ${
            djMode ? "bg-amber text-void" : "text-cream hover:text-amber"
          }`}
        >
          DJ scratch mode
        </button>
        <span className="whitespace-nowrap pr-1.5 text-[0.58rem] text-parchment sm:pr-2 sm:text-[0.66rem]">
          {scratching ? "Scratching" : "Press + drag record"}
        </span>
      </div>
    </div>
  );
}
