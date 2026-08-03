/** Big centered 3-2-1 → GO! countdown overlay. */
export default function Countdown({ n }: { n: number }) {
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
          fontSize: 88,
          fontWeight: 800,
          color: "#fff",
          textShadow: "0 4px 18px rgba(0,0,0,.65)",
        }}
      >
        {label}
      </span>
    </div>
  );
}
