import { useEffect, useReducer, useRef, type CSSProperties } from "react";
import Phaser from "phaser";
import { OVERRUN_HEIGHT, OVERRUN_WIDTH, OverrunScene } from "../../../game/overrun/render/scene";
import type { OverrunConfig } from "../../../game/overrun/render/contract";
import { parseOverrunSandboxConfig } from "../../../game/overrun/sandbox";
import { OverrunSandboxDriver } from "../../../game/overrun/sandboxDriver";
import { ENEMY_KINDS } from "../../../game/overrun/enemies";
import { TOTAL_STAGES } from "../../../game/overrun/stages";
import { GUN_IDS } from "../../../game/overrun/weapons";
import type { EnemyKind, GunId } from "../../../game/overrun/types";

/**
 * Dev-only Overrun test harness (mounted by /games/overrun-sandbox, which is gated to `astro dev`).
 * Drops you into the real scene + sim against a hand-picked set of enemies — no lobby, no P2P — with
 * live controls to swap the target kind / gun and freeze AI. Configure via the URL:
 *   ?enemy=kraken&count=1&gun=dmr&ai=on&hp=2000   (enemy accepts a comma list; kinds cycle over count)
 */
export default function OverrunSandbox() {
  const hostRef = useRef<HTMLDivElement>(null);
  const driverRef = useRef<OverrunSandboxDriver | null>(null);
  const [, refresh] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    if (!import.meta.env.DEV || !hostRef.current) return;
    const config = parseOverrunSandboxConfig(new URLSearchParams(window.location.search));
    const driver = new OverrunSandboxDriver(config);
    driverRef.current = driver;
    refresh();

    const cfg: OverrunConfig = { driver, onHud: () => {}, onEvent: () => {}, onEnd: () => {} };
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      width: OVERRUN_WIDTH,
      height: OVERRUN_HEIGHT,
      parent: hostRef.current,
      backgroundColor: "#181c16",
      scene: [OverrunScene],
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_HORIZONTALLY },
      callbacks: { preBoot: (g) => g.registry.set("cfg", cfg) },
    });
    return () => game.destroy(true);
  }, []);

  // Safe hotkeys only (WASD/mouse/R/1-3 belong to gameplay): [ ] cycle target, \ toggle AI.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const d = driverRef.current;
      if (!d) return;
      if (e.key === "[") d.cycleKind(-1);
      else if (e.key === "]") d.cycleKind(1);
      else if (e.key === "\\") d.toggleAi();
      else return;
      refresh();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!import.meta.env.DEV) {
    return <div className="py-16 text-center text-neutral-500">The sandbox is available in local dev only.</div>;
  }

  const d = driverRef.current;
  const cfg = d?.getConfig();
  const act = (fn: () => void) => () => {
    fn();
    refresh();
  };

  return (
    <div style={{ position: "relative", width: "100%", maxWidth: OVERRUN_WIDTH * 1.4, aspectRatio: `${OVERRUN_WIDTH} / ${OVERRUN_HEIGHT}` }}>
      <div ref={hostRef} style={{ position: "absolute", inset: 0, borderRadius: 12, overflow: "hidden", background: "#181c16" }} />

      {d && cfg && (
        <div style={PANEL}>
          <div style={{ color: "#fcd34d", letterSpacing: "0.08em", marginBottom: 4 }}>OVERRUN SANDBOX</div>

          {d.isCampaign() ? (
            <>
              <div style={{ color: "#94a3b8" }}>
                Campaign — STAGE {cfg.stage}/{TOTAL_STAGES} · AI {d.isAiOn() ? "ON" : "OFF"} · real waves &amp; boss
              </div>
              <div style={ROW}>
                <button style={BTN} onClick={act(() => d.setStage((cfg.stage ?? 1) - 1))}>◀ stage</button>
                <span style={{ minWidth: 44, textAlign: "center", color: "#e2e8f0" }}>{cfg.stage}</span>
                <button style={BTN} onClick={act(() => d.setStage((cfg.stage ?? 1) + 1))}>stage ▶</button>
                <button style={BTN} onClick={act(() => d.respawn())}>Restart</button>
                <button style={BTN} onClick={act(() => d.toggleAi())}>AI {d.isAiOn() ? "⏸" : "▶"}</button>
                <button style={BTN} onClick={act(() => d.setEnemyMode())}>→ enemy inspect</button>
              </div>
            </>
          ) : (
            <>
              <div style={{ color: "#94a3b8" }}>
                {cfg.kinds.join(",")} ×{cfg.count}
                {cfg.hp != null ? ` · hp ${cfg.hp}` : ""} · AI {d.isAiOn() ? "ON" : "OFF"}
              </div>
              <div style={ROW}>
                <button style={BTN} onClick={act(() => d.cycleKind(-1))}>◀</button>
                <span style={{ minWidth: 64, textAlign: "center", color: "#e2e8f0" }}>{cfg.kinds[0]}</span>
                <button style={BTN} onClick={act(() => d.cycleKind(1))}>▶</button>
                <button style={BTN} onClick={act(() => d.toggleAi())}>AI {d.isAiOn() ? "⏸" : "▶"}</button>
                <button style={BTN} onClick={act(() => d.respawn())}>Respawn</button>
                <button style={BTN} onClick={act(() => d.setStage(1))}>→ campaign stage</button>
              </div>
            </>
          )}

          <div style={{ ...ROW, flexWrap: "wrap" }}>
            {GUN_IDS.map((g: GunId) => (
              <button key={g} style={{ ...BTN, borderColor: cfg.gun === g ? "#fcd34d" : "rgba(148,163,184,0.35)" }} onClick={act(() => d.setGun(g))}>
                {g}
              </button>
            ))}
          </div>

          <div style={{ color: "#64748b", marginTop: 4 }}>
            keys: [ ] cycle kind · \ toggle AI — kinds: {(ENEMY_KINDS as EnemyKind[]).join(", ")}
          </div>
        </div>
      )}
    </div>
  );
}

const PANEL: CSSProperties = {
  position: "absolute",
  top: 8,
  left: 8,
  right: 8,
  zIndex: 30,
  padding: "8px 10px",
  borderRadius: 8,
  background: "rgba(2,6,23,0.78)",
  border: "1px solid rgba(148,163,184,0.35)",
  color: "#e2e8f0",
  font: "600 11px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace",
};
const ROW: CSSProperties = { display: "flex", gap: 6, alignItems: "center", marginTop: 6 };
const BTN: CSSProperties = {
  padding: "3px 8px",
  borderRadius: 6,
  background: "rgba(15,23,42,0.9)",
  border: "1px solid rgba(148,163,184,0.35)",
  color: "#e2e8f0",
  font: "inherit",
  cursor: "pointer",
};
