"use client";

import { useEffect, useRef } from "react";
import { usePlayer } from "./PlayerProvider";

/**
 * Equalizer bars that pulse while a preview is playing. Driven by overlapping
 * sines for an organic, musical bounce, written straight to the DOM in a rAF
 * loop (no React re-renders). Flattens when paused and under reduced-motion.
 */
export default function LiveWaveform({
  bars = 8,
  color = "var(--color-amber)",
  className = "",
}: {
  bars?: number;
  color?: string;
  className?: string;
}) {
  const { playing } = usePlayer();
  const refs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      refs.current.forEach((el) => el && (el.style.transform = "scaleY(0.4)"));
      return;
    }
    let raf = 0;
    let t = 0;
    const loop = () => {
      t += 0.09;
      for (let i = 0; i < bars; i++) {
        const h = playing
          ? 0.35 + 0.55 * Math.abs(Math.sin(t + i * 0.7) * Math.cos(t * 0.6 + i * 0.4))
          : 0.16;
        const el = refs.current[i];
        if (el) el.style.transform = `scaleY(${Math.max(0.12, Math.min(1, h)).toFixed(3)})`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, bars]);

  return (
    <div className={`flex items-center gap-[2px] ${className}`} aria-hidden>
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className="w-[3px] flex-1 origin-center rounded-full"
          style={{ height: "100%", background: color, transform: "scaleY(0.16)" }}
        />
      ))}
    </div>
  );
}
