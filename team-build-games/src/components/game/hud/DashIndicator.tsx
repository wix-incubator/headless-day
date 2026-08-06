/** Dash cooldown badge: arrow greys out on use, then a conic sweep brightens it back to ready. */
export default function DashIndicator({ fraction }: { fraction: number }) {
  const ready = fraction >= 1;
  const deg = Math.round(Math.max(0, Math.min(1, fraction)) * 360);
  return (
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: "50%",
        position: "relative",
        background: `conic-gradient(#38bdf8 ${deg}deg, #334155 ${deg}deg)`,
        boxShadow: ready ? "0 0 10px #38bdf8" : "none",
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
        <span style={{ color: ready ? "#7dd3fc" : "#64748b", fontSize: 18, fontWeight: 700 }}>➤</span>
      </div>
    </div>
  );
}
