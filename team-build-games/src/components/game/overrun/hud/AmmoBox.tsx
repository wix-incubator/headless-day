import type { GunId } from "../../../../game/overrun/types";

const GUN_LABEL: Record<GunId, string> = {
  pistol: "PISTOL",
  shotgun: "SHOTGUN",
  rifle: "RIFLE",
  autorifle: "AUTO RIFLE",
  smg: "SMG",
  dmr: "DMR",
  flamethrower: "FLAMETHROWER",
  rocket: "ROCKET",
};

/** Bottom-left HUD: current gun, mag/reserve counts, and a reload progress bar. */
export default function AmmoBox({
  gun,
  mag,
  reserve,
  reloadFraction,
}: {
  gun: GunId;
  mag: number;
  reserve: number | null;
  reloadFraction: number;
}) {
  const reloading = reloadFraction > 0;
  // reloadFraction counts DOWN from 1 (just started) to 0 (done) — invert for a fill-up bar.
  const progress = Math.max(0, Math.min(1, 1 - reloadFraction));
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 3,
        minWidth: 130,
        background: "rgba(15,23,42,.68)",
        border: "1px solid rgba(239,68,68,.45)",
        borderRadius: 8,
        padding: "6px 12px",
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 700, color: "#fca5a5", letterSpacing: 1 }}>{GUN_LABEL[gun]}</span>
      <span style={{ fontSize: 22, fontWeight: 800, color: "#f8fafc", fontFamily: "monospace", lineHeight: 1 }}>
        {mag}
        <span style={{ fontSize: 13, color: "#94a3b8" }}> / {reserve === null ? "∞" : reserve}</span>
      </span>
      {reloading && (
        <div style={{ width: "100%", height: 4, borderRadius: 2, background: "#334155", overflow: "hidden" }}>
          <div style={{ width: `${Math.round(progress * 100)}%`, height: "100%", background: "#fbbf24" }} />
        </div>
      )}
    </div>
  );
}
