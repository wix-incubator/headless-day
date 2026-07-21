import { type Sleeve } from "@/data/rooms";

function Motif({ sleeve }: { sleeve: Sleeve }) {
  const { accent, motif } = sleeve;
  const a = accent;
  switch (motif) {
    case "circle":
      return (
        <>
          <circle cx="50" cy="42" r="26" fill="none" stroke={a} strokeWidth="0.8" opacity="0.7" />
          <circle cx="50" cy="42" r="17" fill="none" stroke={a} strokeWidth="0.5" opacity="0.4" />
          <circle cx="50" cy="42" r="4" fill={a} opacity="0.9" />
        </>
      );
    case "bars":
      return (
        <>
          {[26, 36, 46, 56, 66, 76].map((x, i) => (
            <rect
              key={x}
              x={x}
              y={30 + (i % 2) * 8}
              width="4"
              height={44 - (i % 3) * 12}
              rx="1"
              fill={a}
              opacity={0.5 + (i % 3) * 0.15}
            />
          ))}
        </>
      );
    case "horizon":
      return (
        <>
          <circle cx="50" cy="46" r="18" fill={a} opacity="0.22" />
          <circle cx="50" cy="46" r="18" fill="none" stroke={a} strokeWidth="0.6" opacity="0.7" />
          <line x1="14" y1="64" x2="86" y2="64" stroke={a} strokeWidth="0.6" opacity="0.5" />
          <line x1="22" y1="70" x2="78" y2="70" stroke={a} strokeWidth="0.4" opacity="0.3" />
        </>
      );
    case "split":
      return (
        <>
          <path d="M20 78 L50 22 L80 78" fill="none" stroke={a} strokeWidth="0.8" opacity="0.6" />
          <path d="M32 78 L50 44 L68 78" fill="none" stroke={a} strokeWidth="0.5" opacity="0.35" />
        </>
      );
    case "grid":
      return (
        <>
          {[0, 1, 2].map((r) =>
            [0, 1, 2].map((c) => (
              <rect
                key={`${r}-${c}`}
                x={30 + c * 16}
                y={26 + r * 16}
                width="10"
                height="10"
                rx="1.5"
                fill="none"
                stroke={a}
                strokeWidth="0.6"
                opacity={0.3 + ((r + c) % 3) * 0.2}
              />
            )),
          )}
        </>
      );
    case "arc":
      return (
        <>
          <path d="M18 74 A34 34 0 0 1 82 74" fill="none" stroke={a} strokeWidth="0.8" opacity="0.6" />
          <path d="M28 74 A24 24 0 0 1 72 74" fill="none" stroke={a} strokeWidth="0.5" opacity="0.4" />
          <circle cx="50" cy="74" r="3" fill={a} />
        </>
      );
  }
}

/**
 * Pure-CSS record sleeve. No external images — a warm gradient, an abstract
 * screen-printed motif, and a foil label. Sits in front of an optional vinyl disc.
 */
export default function AlbumArt({
  sleeve,
  label,
  sub,
  className = "",
}: {
  sleeve: Sleeve;
  label?: string;
  sub?: string;
  className?: string;
}) {
  return (
    <div
      className={`relative aspect-square w-full overflow-hidden rounded-[3px] ${className}`}
      style={{
        background: `linear-gradient(150deg, ${sleeve.from}, ${sleeve.to})`,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), inset 0 0 60px rgba(0,0,0,0.5)",
      }}
    >
      {/* printed motif */}
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden>
        <Motif sleeve={sleeve} />
      </svg>

      {/* soft sheen sweeping across the sleeve */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.14) 50%, transparent 60%)",
        }}
      />

      {/* foil label bottom-left */}
      {label && (
        <div className="absolute inset-x-0 bottom-0 p-[7%]">
          <div
            className="font-display text-[clamp(0.7rem,1.6vw,1rem)] leading-tight text-cream"
            style={{ textShadow: "0 1px 8px rgba(0,0,0,0.6)" }}
          >
            {label}
          </div>
          {sub && (
            <div className="mt-0.5 text-[0.6rem] uppercase tracking-[0.22em] text-cream/60">
              {sub}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
