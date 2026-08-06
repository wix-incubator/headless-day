/** Big centered 3-2-1 → GO! countdown overlay, red/military styled for Overrun. */
export default function OverrunCountdown({ n }: { n: number }) {
  const label = n > 0 ? String(n) : "GO!";
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <span
        key={label}
        style={{
          fontSize: 96,
          fontWeight: 800,
          fontFamily: "monospace",
          letterSpacing: 2,
          color: "#ef4444",
          textShadow: "0 0 26px rgba(239,68,68,.65), 0 4px 18px rgba(0,0,0,.75)",
        }}
      >
        {label}
      </span>
    </div>
  );
}
