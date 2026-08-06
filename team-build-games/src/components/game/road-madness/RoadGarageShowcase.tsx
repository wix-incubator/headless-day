import { createElement, useEffect, useState } from "react";
import type { VehicleClass } from "../../../game/road-madness/types";
import { VEHICLES } from "../../../game/road-madness/vehicles";

interface Props {
  vehicle: VehicleClass;
}

const MODEL_URL: Record<"derby" | "monster", string> = {
  derby: "/assets/road-madness/models/derby-cyber.glb",
  monster: "/assets/road-madness/models/monster-cyber.glb",
};

function GarageCarModel({ vehicle, name }: { vehicle: "derby" | "monster"; name: string }) {
  const [viewerReady, setViewerReady] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let active = true;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotionPreference = () => setReduceMotion(media.matches);
    syncMotionPreference();
    media.addEventListener("change", syncMotionPreference);

    void import("@google/model-viewer").then(() => {
      if (active) setViewerReady(true);
    });

    return () => {
      active = false;
      media.removeEventListener("change", syncMotionPreference);
    };
  }, []);

  if (!viewerReady) {
    return <div className="road-car-model-loading font-display text-[8px] text-cyan-200">Loading cyber chassis…</div>;
  }

  return createElement("model-viewer", {
    key: vehicle,
    className: `road-car-model-viewer road-car-model-viewer--${vehicle}`,
    src: MODEL_URL[vehicle],
    alt: `${name} cyber demolition derby 3D model`,
    "auto-rotate": reduceMotion ? undefined : true,
    "auto-rotate-delay": "0",
    "rotation-per-second": "20deg",
    "camera-controls": true,
    "disable-pan": true,
    "disable-zoom": true,
    "interaction-prompt": "none",
    "shadow-intensity": "1.45",
    "shadow-softness": "0.72",
    exposure: vehicle === "monster" ? "1.05" : "1.12",
    "environment-image": "neutral",
    "camera-orbit": vehicle === "monster" ? "36deg 67deg 4.45m" : "36deg 67deg 4.1m",
    "min-camera-orbit": "auto 62deg auto",
    "max-camera-orbit": "auto 73deg auto",
    "field-of-view": "27deg",
  });
}

/** Cyber-styled real GLB garage preview, with PNG sprites kept for in-game readability. */
export default function RoadGarageShowcase({ vehicle }: Props) {
  const def = VEHICLES[vehicle];
  const displayVehicle = vehicle === "monster" ? "monster" : "derby";

  return (
    <section
      className="road-garage-stage"
      aria-label={`${def.name} vehicle rotating on the garage inspection podium`}
    >
      <div className="road-garage-ceiling" aria-hidden="true">
        <span /><span /><span />
      </div>
      <div className="road-garage-beam" aria-hidden="true" />
      <div className="road-garage-backwall" aria-hidden="true">
        <span className="road-garage-door road-garage-door--left" />
        <span className="road-garage-door road-garage-door--right" />
        <span className="road-garage-sign">BAY 07</span>
      </div>
      <div className="road-garage-floor" aria-hidden="true" />
      <div className="road-garage-workbench" aria-hidden="true">
        <span className="road-garage-pegboard">
          <i className="road-garage-tool road-garage-tool--wrench" />
          <i className="road-garage-tool road-garage-tool--hammer" />
          <i className="road-garage-tool road-garage-tool--driver" />
          <i className="road-garage-tool road-garage-tool--pliers" />
        </span>
        <span className="road-garage-bench-top" />
        <span className="road-garage-bench-leg road-garage-bench-leg--left" />
        <span className="road-garage-bench-leg road-garage-bench-leg--right" />
        <span className="road-garage-oil-can" />
      </div>
      <div className="road-garage-equipment" aria-hidden="true">
        <span className="road-garage-toolbox"><i /><i /><i /><i /></span>
        <span className="road-garage-crate road-garage-crate--one" />
        <span className="road-garage-crate road-garage-crate--two" />
        <span className="road-garage-tires"><i /><i /><i /></span>
        <span className="road-garage-jack" />
      </div>
      <div className="road-garage-podium" aria-hidden="true">
        <span className="road-garage-podium__ring" />
        <span className="road-garage-podium__core" />
      </div>

      <div className="road-car-model-shell">
        <GarageCarModel vehicle={displayVehicle} name={def.name} />
      </div>

      <div className="road-garage-readout">
        <span className="font-display text-[7px] text-amber-300">Selected chassis</span>
        <strong className="font-display text-sm text-white">{def.name}</strong>
        <span className="font-mono text-[10px] text-neutral-400">
          {def.health} HP · {Math.round(def.maxSpeed * 3.6)} KM/H · MASS {def.mass.toFixed(1)}
        </span>
      </div>
      <div className="road-garage-status font-display text-[7px] text-cyan-300">
        <span className="road-garage-status__dot" /> inspection ready
      </div>
    </section>
  );
}
