import { PERKS } from "../../../../game/overrun/perks";
import type { PerkOffer } from "../../../../game/overrun/types";

/**
 * Right-edge HUD: the head level-up offer as 3 clickable cards (keys 1/2/3 also work,
 * routed through the scene's keyboard reader → RawShooterInput.pick1/2/3 → the sim).
 */
export default function PerkOffersOverlay({
  offer,
  queued,
  onPick,
}: {
  offer: PerkOffer | null;
  queued: number;
  onPick: (i: 0 | 1 | 2) => void;
}) {
  if (!offer) return null;
  return (
    <div
      style={{
        position: "absolute",
        right: 12,
        top: "50%",
        transform: "translateY(-50%)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        pointerEvents: "auto",
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 700, color: "#fbbf24", textAlign: "center" }}>
        LEVEL UP{queued > 1 ? ` (+${queued - 1} queued)` : ""}
      </span>
      {offer.choices.map((id, i) => {
        const def = PERKS[id];
        return (
          <button
            key={id}
            onClick={() => onPick(i as 0 | 1 | 2)}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              width: 172,
              textAlign: "left",
              cursor: "pointer",
              background: "rgba(15,23,42,.88)",
              border: "1px solid rgba(239,68,68,.55)",
              borderRadius: 8,
              padding: "8px 10px",
              color: "#f8fafc",
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 700, color: "#fca5a5" }}>
              [{i + 1}] {def.name}
            </span>
            <span style={{ fontSize: 11, color: "#cbd5e1" }}>{def.blurb}</span>
          </button>
        );
      })}
    </div>
  );
}
