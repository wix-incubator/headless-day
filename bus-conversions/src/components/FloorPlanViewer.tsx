import { useState } from "react";

export interface FloorZone {
  id: string;
  label: string;
  name: string;
  flex: number;
  desc: string;
}

interface Props {
  zones: FloorZone[];
  busName?: string;
  meta?: string;
}

const ACCENT = "#DFFF4F";
const OLIVE = "#273B1F";
const BORDER = "#D8D2BC";

/**
 * Interactive floor-plan viewer (bonus). Tap a zone along the
 * 40-ft bus body to read what lives there. Keyboard accessible.
 */
export default function FloorPlanViewer({
  zones,
  busName = "The Cascadia",
  meta = "2006 Gillig Phantom · sleeps 2",
}: Props) {
  const [active, setActive] = useState(zones[0]?.id);
  const activeZone = zones.find((z) => z.id === active) ?? zones[0];

  return (
    <div
      style={{
        background: "var(--color-surface)",
        border: `1px solid ${BORDER}`,
        borderRadius: "10px",
        overflow: "hidden",
        color: "var(--color-text)",
      }}
    >
      <div
        style={{
          padding: "clamp(22px,4vw,34px) clamp(20px,4vw,38px) clamp(14px,2vw,20px)",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: "14px",
          borderBottom: `1px solid ${BORDER}`,
        }}
      >
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "13px", letterSpacing: "2px", textTransform: "uppercase" }}>
            Walk the floor plan · {busName}
          </div>
          <h3 className="display" style={{ margin: "6px 0 0", fontSize: "clamp(24px,3.4vw,38px)", lineHeight: 1, fontFamily: "var(--font-display)", fontWeight: 900 }}>
            40 ft, front to rear. Tap a zone.
          </h3>
        </div>
        <div style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>
          {meta} · ←&nbsp;scroll the plan
        </div>
      </div>

      <div style={{ padding: "clamp(20px,4vw,34px) clamp(20px,4vw,38px) clamp(8px,2vw,16px)", overflowX: "auto" }}>
        <div style={{ minWidth: "680px" }}>
          {/* window strip */}
          <div style={{ display: "flex", gap: "5px", padding: "0 0 6px 64px" }}>
            <div style={{ display: "flex", gap: "5px", flex: 1 }}>
              {Array.from({ length: 11 }).map((_, i) => (
                <span
                  key={i}
                  style={{
                    flex: 1,
                    height: "14px",
                    borderRadius: "2px",
                    background: i % 4 === 3 ? "rgba(222,255,78,.5)" : "rgba(40,51,17,.22)",
                  }}
                />
              ))}
            </div>
          </div>
          {/* body */}
          <div style={{ display: "flex", alignItems: "stretch", gap: "4px", position: "relative" }}>
            <div
              style={{
                width: "60px",
                flex: "none",
                background: OLIVE,
                borderRadius: "30px 4px 4px 30px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "12px", letterSpacing: "2px", textTransform: "uppercase", color: ACCENT }}>
                Cab
              </span>
            </div>
            <div style={{ flex: 1, display: "flex", gap: "4px", height: "clamp(150px,22vw,210px)" }}>
              {zones.map((z) => {
                const on = z.id === active;
                return (
                  <button
                    key={z.id}
                    type="button"
                    onClick={() => setActive(z.id)}
                    aria-pressed={on}
                    style={{
                      flex: z.flex,
                      minWidth: 0,
                      cursor: "pointer",
                      textAlign: "left",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      padding: "14px 12px",
                      borderRadius: "4px",
                      transition: "background .18s ease, box-shadow .18s ease",
                      border: on ? `2px solid ${ACCENT}` : `1px solid ${BORDER}`,
                      background: on ? OLIVE : "#fff",
                      color: on ? "#EFE5D8" : "#292222",
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "20px", color: on ? ACCENT : "#292222", lineHeight: 1 }}>
                      {z.label}
                    </span>
                    <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "clamp(13px,1.6vw,17px)", textTransform: "uppercase", letterSpacing: ".5px", marginTop: "8px", lineHeight: 1 }}>
                      {z.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          {/* wheels */}
          <div style={{ position: "relative", height: "18px", marginTop: "2px" }}>
            <div style={{ position: "absolute", left: "78px", top: 0, width: "64px", height: "14px", background: OLIVE, borderRadius: "0 0 8px 8px" }} />
            <div style={{ position: "absolute", right: "36px", top: 0, width: "88px", height: "14px", background: OLIVE, borderRadius: "0 0 8px 8px" }} />
          </div>
        </div>
      </div>

      {/* detail panel */}
      <div
        aria-live="polite"
        style={{
          padding: "clamp(18px,3vw,28px) clamp(20px,4vw,38px) clamp(24px,4vw,36px)",
          borderTop: `1px solid ${BORDER}`,
          background: "var(--color-background)",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: "14px", marginBottom: "10px" }}>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "clamp(34px,5vw,52px)", color: ACCENT, lineHeight: 0.8 }}>
            {activeZone.label}
          </span>
          <h4 className="display" style={{ margin: 0, fontSize: "clamp(22px,3.2vw,32px)", lineHeight: 1, fontFamily: "var(--font-display)", fontWeight: 900 }}>
            {activeZone.name}
          </h4>
        </div>
        <p style={{ margin: 0, maxWidth: "62ch", fontSize: "clamp(15px,1.9vw,18px)", lineHeight: 1.6, color: "var(--color-primary-soft)" }}>
          {activeZone.desc}
        </p>
      </div>
    </div>
  );
}
