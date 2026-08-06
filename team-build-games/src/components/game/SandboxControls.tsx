import { useEffect, useReducer, type CSSProperties } from "react";
import type { SandboxDriver } from "../../game/arena/sandboxDriver";
import { WEAPON_LIST } from "../../game/arena/weapons";

/**
 * Dev-only overlay for the Arena sandbox (`?sandbox`): a config readout + live keybinds. The driver
 * is mutated in place, so we force a re-render on each keypress to refresh the readout.
 * R respawn · T toggle AI · [ / ] cycle target · 1‑6 swap weapon.
 */
export default function SandboxControls({ driver }: { driver: SandboxDriver }) {
  const [, refresh] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "r") driver.respawn();
      else if (k === "t") driver.toggleAi();
      else if (e.key === "[") driver.cycleEnemy(-1);
      else if (e.key === "]") driver.cycleEnemy(1);
      else if (/^[1-6]$/.test(e.key)) {
        const weapon = WEAPON_LIST[Number(e.key) - 1];
        if (weapon) driver.setWeapon(weapon);
      } else return;
      refresh();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [driver]);

  const cfg = driver.getConfig();
  const row: CSSProperties = { whiteSpace: "nowrap" };
  return (
    <div
      style={{
        position: "absolute",
        top: 8,
        right: 8,
        zIndex: 30,
        padding: "6px 9px",
        borderRadius: 8,
        background: "rgba(2,6,23,0.72)",
        border: "1px solid rgba(148,163,184,0.35)",
        color: "#e2e8f0",
        font: "600 10px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace",
        pointerEvents: "none",
        textAlign: "right",
      }}
    >
      <div style={{ ...row, color: "#fcd34d", letterSpacing: "0.08em" }}>SANDBOX</div>
      <div style={row}>
        {cfg.targets.join(",")} ×{cfg.count} · {cfg.weapon}
      </div>
      <div style={row}>
        ai {cfg.ai} → {driver.isAiOn() ? "ON" : "OFF"} · dist {cfg.dist}
        {cfg.hp != null ? ` · hp ${cfg.hp}` : ""}
      </div>
      <div style={{ ...row, color: "#94a3b8", marginTop: 2 }}>R · T · [ ] · 1‑6</div>
    </div>
  );
}
