import type { CSSProperties } from "react";
import type { GunId, PlayerId } from "../../../game/overrun/types";

interface RosterEntry {
  id: PlayerId;
  name: string;
}

interface Props {
  roster: RosterEntry[];
  localId: PlayerId;
  hostId: PlayerId | null;
  isHost: boolean;
  onKick: (id: PlayerId) => void;
  onMakeHost: (id: PlayerId) => void;
  soldierAssetUrl?: string;
  weaponAssetUrls?: Partial<Record<GunId, string>>;
}

interface SoldierProps {
  player: RosterEntry;
  localId: PlayerId;
  hostId: PlayerId | null;
  roomIsHostedHere: boolean;
  image?: string;
  color: string;
  onKick: (id: PlayerId) => void;
  onMakeHost: (id: PlayerId) => void;
}

function Soldier({
  player,
  localId,
  hostId,
  roomIsHostedHere,
  image,
  color,
  onKick,
  onMakeHost,
}: SoldierProps) {
  const local = player.id === localId;
  return (
    <div
      className={`overrun-ready-soldier ${local ? "overrun-ready-soldier--local" : ""}`}
      style={{ "--squad-color": color } as CSSProperties}
      aria-label={`${player.name}${local ? ", you" : ""}${player.id === hostId ? ", room host" : ""}`}
    >
      <span className="overrun-ready-soldier__nameplate">
        <span className="overrun-ready-soldier__name">
          {local ? "YOU" : player.name}
          {player.id === hostId && <small>HOST</small>}
        </span>
        {roomIsHostedHere && !local && (
          <span className="overrun-ready-soldier__actions">
            <button type="button" onClick={() => onMakeHost(player.id)} title={`Make ${player.name} host`} aria-label={`Make ${player.name} host`}>★</button>
            <button type="button" onClick={() => onKick(player.id)} title={`Remove ${player.name}`} aria-label={`Remove ${player.name}`}>×</button>
          </span>
        )}
      </span>
      {image ? (
        <img src={image} alt="" />
      ) : (
        <span className="overrun-ready-soldier__fallback" aria-hidden="true">
          <i className="overrun-ready-soldier__head" />
          <i className="overrun-ready-soldier__body" />
          <i className="overrun-ready-soldier__rifle" />
        </span>
      )}
    </div>
  );
}

const SQUAD_COLORS = ["#f8fafc", "#fbbf24", "#38bdf8", "#f472b6", "#a3e635", "#c084fc", "#fb923c", "#2dd4bf"];

export default function OverrunReadyRoom({
  roster,
  localId,
  hostId,
  isHost,
  onKick,
  onMakeHost,
  soldierAssetUrl,
  weaponAssetUrls,
}: Props) {
  // Local player first + row-reverse CSS pins them to the far-right floor slot.
  const visibleSquad = [
    ...roster.filter((player) => player.id === localId),
    ...roster.filter((player) => player.id !== localId),
  ].slice(0, 8);
  return (
    <section className="overrun-ready-stage" aria-label="Squad preparing in a tactical equipment room">
      <div className="overrun-ready-ceiling" aria-hidden="true"><i /><i /><i /></div>
      <div className="overrun-ready-pegboard" aria-hidden="true">
        <span className="overrun-gear overrun-gear--helmet" />
        <span className="overrun-gear overrun-gear--vest" />
        {(["pistol", "shotgun", "rifle"] as GunId[]).map((gun) =>
          weaponAssetUrls?.[gun] ? (
            <img key={gun} className={`overrun-gear-weapon overrun-gear-weapon--${gun}`} src={weaponAssetUrls[gun]} alt="" />
          ) : (
            <span key={gun} className={`overrun-gear-weapon overrun-gear-weapon--${gun} overrun-gear-weapon--fallback`} />
          ),
        )}
      </div>
      <div className="overrun-ready-lockers" aria-hidden="true"><i /><i /><i /></div>
      <div className="overrun-ready-table" aria-hidden="true">
        <span className="overrun-ready-map" />
        <span className="overrun-ready-radio" />
        <span className="overrun-ready-medkit">+</span>
      </div>
      <div className="overrun-ready-crates" aria-hidden="true"><i /><i /></div>
      <div className="overrun-ready-monitor" aria-hidden="true">
        <span>SECTOR 04</span>
        <strong>HOSTILES: ∞</strong>
        <i />
      </div>

      <div className="overrun-ready-squad">
        {visibleSquad.map((player) => {
          const colorIndex = roster.findIndex((entry) => entry.id === player.id);
          return (
            <Soldier
              key={player.id}
              player={player}
              localId={localId}
              hostId={hostId}
              roomIsHostedHere={isHost}
              image={soldierAssetUrl}
              color={SQUAD_COLORS[Math.max(0, colorIndex) % SQUAD_COLORS.length]!}
              onKick={onKick}
              onMakeHost={onMakeHost}
            />
          );
        })}
      </div>

      <div className="overrun-ready-copy">
        <span className="font-display text-[7px] text-red-300">Forward operating room</span>
        <strong className="font-display text-sm text-white">Gear up. Check your squad.</strong>
        <span className="text-xs text-emerald-100/70">Pistols loaded · medkits packed · extraction unavailable</span>
      </div>
      <div className="overrun-ready-status font-display text-[7px] text-emerald-300">
        <span /> squad link · {roster.length}/8
      </div>
    </section>
  );
}
