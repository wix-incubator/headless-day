/**
 * A CSS vinyl record — deep grooves, a warm center label, spindle hole and a
 * light-catching sheen. `spinning` drives the slow rotation.
 */
export default function VinylDisc({
  label,
  accent = "#c8a35a",
  spinning = false,
  className = "",
}: {
  label?: string;
  accent?: string;
  spinning?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`relative aspect-square rounded-full grooves ${className}`}
      style={{
        boxShadow:
          "0 24px 60px -20px rgba(0,0,0,0.8), 0 0 0 1.5px rgba(244,232,208,0.22), inset 0 0 40px rgba(0,0,0,0.85), inset 0 0 0 1px rgba(244,232,208,0.06)",
        animation: spinning ? "spin-slow 6s linear infinite" : undefined,
      }}
    >
      {/* light streak catching the grooves */}
      <div
        className="pointer-events-none absolute inset-0 rounded-full opacity-90"
        style={{
          background:
            "conic-gradient(from 210deg, transparent 0deg, rgba(244,232,208,0.32) 30deg, transparent 70deg, transparent 200deg, rgba(226,165,82,0.28) 240deg, transparent 290deg)",
        }}
      />
      {/* center label */}
      <div
        className="absolute left-1/2 top-1/2 aspect-square w-[34%] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background: `radial-gradient(circle at 40% 35%, ${accent}, ${accent}99 55%, ${accent}55)`,
          boxShadow: "0 0 0 1px rgba(0,0,0,0.5), inset 0 1px 4px rgba(255,255,255,0.3)",
        }}
      >
        {label && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="px-2 text-center text-[0.5rem] font-semibold uppercase leading-tight tracking-[0.15em] text-void/80">
              {label}
            </span>
          </div>
        )}
        {/* spindle hole */}
        <div className="absolute left-1/2 top-1/2 h-[8%] w-[8%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-void shadow-[inset_0_1px_2px_rgba(0,0,0,0.9)]" />
      </div>
    </div>
  );
}
