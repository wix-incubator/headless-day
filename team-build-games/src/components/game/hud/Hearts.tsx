/** HUD hearts: filled ♥ for current health, hollow ♡ for lost health. */
export default function Hearts({ health, max = 3 }: { health: number; max?: number }) {
  return (
    <div style={{ display: "flex", gap: 2, fontSize: 24, lineHeight: 1, color: "#ff4d6d" }}>
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,.5))" }}>
          {i < health ? "♥" : "♡"}
        </span>
      ))}
    </div>
  );
}
