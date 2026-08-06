import type { CSSProperties } from "react";
import type { LobbyPlayer } from "../../../game/net/lobby";
import type { Shape } from "../../../game/arena/cosmetic";
import { BODY_ASSET } from "../../../game/arena/cosmetic";
import { WEAPON_INFO, type Weapon } from "../../../game/arena/weapons";
import { MAX_PLAYERS } from "../../../game/constants";

interface Props {
  roster: LobbyPlayer[];
  localId: string;
  hostId: string | null;
  isHost: boolean;
  shape: Shape;
  weapon: Weapon;
  onKick: (id: string) => void;
  onMakeHost: (id: string) => void;
}

const PARTY_COLORS = ["#fbbf24", "#67e8f9", "#fca5a5", "#c4b5fd", "#86efac", "#fdba74", "#f9a8d4", "#93c5fd"];

interface WarriorProps {
  player: LobbyPlayer;
  localId: string;
  hostId: string | null;
  roomIsHostedHere: boolean;
  shape: Shape;
  weapon: Weapon;
  color: string;
  onKick: (id: string) => void;
  onMakeHost: (id: string) => void;
}

function Warrior({
  player,
  localId,
  hostId,
  roomIsHostedHere,
  shape,
  weapon,
  color,
  onKick,
  onMakeHost,
}: WarriorProps) {
  const local = player.id === localId;
  return (
    <div
      className={`arena-ready-warrior ${local ? "arena-ready-warrior--local" : ""}`}
      style={{ "--party-color": color } as CSSProperties}
      aria-label={`${player.name}${local ? ", you" : ""}${player.id === hostId ? ", room host" : ""}`}
    >
      <span className="arena-ready-warrior__nameplate">
        <span className="arena-ready-warrior__name">
          {local ? "YOU" : player.name}
          {player.id === hostId && <small>HOST</small>}
        </span>
        {roomIsHostedHere && !local && (
          <span className="arena-ready-warrior__actions">
            <button type="button" onClick={() => onMakeHost(player.id)} title={`Make ${player.name} host`} aria-label={`Make ${player.name} host`}>★</button>
            <button type="button" onClick={() => onKick(player.id)} title={`Remove ${player.name}`} aria-label={`Remove ${player.name}`}>×</button>
          </span>
        )}
      </span>
      <span className="arena-ready-warrior__figure" aria-hidden="true">
        <span className="arena-ready-warrior__shadow" />
        <img className="arena-ready-warrior__body" src={BODY_ASSET[shape]} alt="" />
        <img className={`arena-ready-warrior__weapon arena-ready-warrior__weapon--${weapon}`} src={WEAPON_INFO[weapon].asset} alt="" />
      </span>
    </div>
  );
}

export default function ArenaReadyRoom({
  roster,
  localId,
  hostId,
  isHost,
  shape,
  weapon,
  onKick,
  onMakeHost,
}: Props) {
  // Keep the local player in the first slot; row-reverse places that slot on the right.
  const visibleParty = [
    ...roster.filter((player) => player.id === localId),
    ...roster.filter((player) => player.id !== localId),
  ].slice(0, MAX_PLAYERS);

  return (
    <section className="arena-ready-stage" aria-label="Gladiators preparing beneath the colosseum">
      <div className="arena-stonework" aria-hidden="true" />
      <div className="arena-arch arena-arch--left" aria-hidden="true" />
      <div className="arena-arch arena-arch--right" aria-hidden="true" />
      <div className="arena-gate" aria-hidden="true">
        {Array.from({ length: 8 }, (_, index) => <i key={index} />)}
      </div>
      <div className="arena-daylight" aria-hidden="true" />
      <div className="arena-torch arena-torch--left" aria-hidden="true"><i /></div>
      <div className="arena-torch arena-torch--right" aria-hidden="true"><i /></div>
      <div className="arena-weapon-rack" aria-hidden="true">
        <img src="/assets/arena/weapons/spear.png" alt="" />
        <img src="/assets/arena/weapons/sword.png" alt="" />
        <img src="/assets/arena/weapons/bow.png" alt="" />
      </div>
      <div className="arena-bench" aria-hidden="true" />

      <div className="arena-ready-party">
        {visibleParty.map((player) => {
          const local = player.id === localId;
          const colorIndex = roster.findIndex((entry) => entry.id === player.id);
          return (
            <Warrior
              key={player.id}
              player={player}
              localId={localId}
              hostId={hostId}
              roomIsHostedHere={isHost}
              shape={local ? shape : player.shape}
              weapon={local ? weapon : player.weapon}
              color={PARTY_COLORS[Math.max(0, colorIndex) % PARTY_COLORS.length]!}
              onKick={onKick}
              onMakeHost={onMakeHost}
            />
          );
        })}
      </div>

      <div className="arena-ready-copy">
        <span className="font-display text-[7px] text-amber-300">Colosseum undercroft</span>
        <strong className="font-display text-sm text-white">The gate awaits</strong>
        <span className="text-xs text-stone-300">Choose your steel. Hear the crowd. Enter on the host&apos;s mark.</span>
      </div>
      <div className="arena-crowd-meter font-display text-[7px] text-cyan-200">
        Battle party · {roster.length}/{MAX_PLAYERS}
      </div>
    </section>
  );
}
