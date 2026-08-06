/** Circular cooldown badge: a glyph that greys out on use, then a conic sweep brightens it to ready. */
export default function CooldownBadge({
  fraction,
  glyph,
  color,
}: {
  fraction: number;
  glyph: string;
  color: string;
}) {
  const f = Math.max(0, Math.min(1, fraction));
  const ready = f >= 1;
  const deg = Math.round(f * 360);
  return (
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: "50%",
        position: "relative",
        background: `conic-gradient(${color} ${deg}deg, #334155 ${deg}deg)`,
        boxShadow: ready ? `0 0 10px ${color}` : "none",
        transition: "box-shadow .2s",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 4,
          borderRadius: "50%",
          background: "#0f172a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ color: ready ? color : "#64748b", fontSize: 16, fontWeight: 700 }}>{glyph}</span>
      </div>
    </div>
  );
}
