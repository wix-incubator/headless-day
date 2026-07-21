"use client";

/**
 * Subtle animated equalizer. Deterministic per-bar timing (no randomness at
 * render) so it's SSR-safe. Pauses under prefers-reduced-motion via the global
 * media query in globals.css.
 */
export default function Waveform({
  bars = 5,
  color = "var(--color-amber)",
  className = "",
  playing = true,
}: {
  bars?: number;
  color?: string;
  className?: string;
  playing?: boolean;
}) {
  return (
    <div className={`flex items-end gap-[2px] ${className}`} aria-hidden>
      {Array.from({ length: bars }).map((_, i) => {
        const dur = 0.7 + ((i * 37) % 60) / 100;
        const delay = ((i * 53) % 50) / 100;
        return (
          <span
            key={i}
            className="w-[2px] flex-1 origin-bottom rounded-full"
            style={{
              height: "100%",
              background: color,
              animation: playing ? `eq ${dur}s ${delay}s ease-in-out infinite` : undefined,
              transform: playing ? undefined : "scaleY(0.3)",
            }}
          />
        );
      })}
    </div>
  );
}
