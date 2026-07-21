"use client";

import { useEffect, useRef } from "react";
import { usePlayer } from "./player/PlayerProvider";

/**
 * Fixed atmospheric backdrop: two slow smoky gradients plus a warm spotlight
 * that eases toward the cursor.
 *
 * Perf: the spotlight is a fixed-size pre-rendered radial that we only ever
 * `translate` — so it stays on the compositor and never triggers a full-screen
 * gradient repaint per frame (the old version re-rasterised a viewport-sized
 * radial-gradient every rAF, which was the main scroll/pointer jank).
 */
export default function SpotlightBackground() {
  const spot = useRef<HTMLDivElement>(null);
  const { playing, current } = usePlayer();

  useEffect(() => {
    const el = spot.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Coarse pointers (touch) never hover — skip the loop entirely.
    if (!window.matchMedia("(pointer: fine)").matches) return;

    let tx = window.innerWidth / 2;
    let ty = window.innerHeight * 0.35;
    let x = tx;
    let y = ty;
    let raf = 0;
    let running = true;

    const onMove = (e: PointerEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      if (!running) {
        running = true;
        raf = requestAnimationFrame(loop);
      }
    };

    const loop = () => {
      x += (tx - x) * 0.08;
      y += (ty - y) * 0.08;
      el.style.transform = `translate3d(${x - 400}px, ${y - 400}px, 0)`;
      // Sleep the loop once we've essentially caught up — saves battery when idle.
      if (Math.abs(tx - x) < 0.5 && Math.abs(ty - y) < 0.5) {
        running = false;
        return;
      }
      raf = requestAnimationFrame(loop);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-void" />

      {/* smoky drifting gradients — transform-only keyframes, promoted to their own layer */}
      <div
        className="absolute -left-[20%] -top-[20%] hidden h-[70vh] w-[70vh] rounded-full opacity-50 blur-[70px] [will-change:transform] sm:block"
        style={{
          background: "radial-gradient(circle, rgba(74,23,23,0.55), transparent 70%)",
          animation: "drift 16s ease-in-out infinite",
        }}
      />
      <div
        className="absolute -bottom-[15%] -right-[10%] hidden h-[65vh] w-[65vh] rounded-full opacity-40 blur-[80px] [will-change:transform] sm:block"
        style={{
          background: "radial-gradient(circle, rgba(180,95,42,0.4), transparent 70%)",
          animation: "drift 20s ease-in-out infinite reverse",
        }}
      />

      {/* cursor spotlight — 800px pre-rendered radial we only translate */}
      <div
        ref={spot}
        className="absolute left-0 top-0 hidden h-[800px] w-[800px] [will-change:transform] sm:block"
        style={{
          background:
            "radial-gradient(circle at center, rgba(216,154,69,0.12), transparent 60%)",
          transform: "translate3d(calc(50vw - 400px), calc(35vh - 400px), 0)",
        }}
      />

      {/* ambient pulse — the whole room breathes gently with whatever is playing */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-0 transition-opacity duration-[1200ms]"
        style={{
          opacity: playing ? 1 : 0,
          background: `radial-gradient(90% 60% at 50% 15%, ${current?.accent ?? "#e2a552"}22, transparent 65%)`,
          animation: playing ? "breathe 4.5s ease-in-out infinite" : undefined,
        }}
      />

      {/* vignette to seat everything in the dark */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(130% 100% at 50% 0%, transparent 58%, rgba(10,8,6,0.55) 100%)",
        }}
      />
    </div>
  );
}
