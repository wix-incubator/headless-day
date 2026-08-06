/** Bottom-center HUD: level badge + XP progress toward the next level-up offer. */
export default function XpBar({ xp, xpNext, level }: { xp: number; xpNext: number; level: number }) {
  const pct = xpNext > 0 ? Math.max(0, Math.min(1, xp / xpNext)) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, width: 260 }}>
      <span style={{ fontSize: 12, fontWeight: 800, color: "#fbbf24", fontFamily: "monospace", whiteSpace: "nowrap" }}>
        LV {level}
      </span>
      <div
        style={{
          flex: 1,
          height: 8,
          borderRadius: 4,
          background: "rgba(15,23,42,.7)",
          border: "1px solid rgba(148,163,184,.35)",
          overflow: "hidden",
        }}
      >
        <div style={{ width: `${Math.round(pct * 100)}%`, height: "100%", background: "linear-gradient(90deg,#4ade80,#22c55e)" }} />
      </div>
    </div>
  );
}
