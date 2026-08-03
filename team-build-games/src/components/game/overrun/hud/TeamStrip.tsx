import type { TeammateHud } from "../../../../game/overrun/render/contract";

/** 8 distinct squad ring colors, indexed by colorIndex (matches the scene's soldier tint). */
const RING_COLORS = ["#f8fafc", "#fbbf24", "#38bdf8", "#f472b6", "#a3e635", "#c084fc", "#fb923c", "#2dd4bf"];

/** Top-left HUD: one compact row per teammate — squad-color dot, name, status/health. */
export default function TeamStrip({ teammates }: { teammates: TeammateHud[] }) {
  if (teammates.length === 0) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {teammates.map((t) => (
        <div
          key={t.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            fontFamily: "monospace",
            opacity: t.status === "dead" ? 0.45 : 1,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: RING_COLORS[t.colorIndex % RING_COLORS.length],
              boxShadow: t.status === "downed" ? "0 0 6px #ef4444" : "none",
            }}
          />
          <span
            style={{
              color: "#e2e8f0",
              maxWidth: 72,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {t.name}
          </span>
          <span style={{ color: t.status === "downed" ? "#fca5a5" : "#94a3b8" }}>
            {t.status === "dead" ? "☠" : Math.round(t.health)}
          </span>
        </div>
      ))}
    </div>
  );
}
