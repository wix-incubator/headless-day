import { useRef } from 'react';
import { useGame } from '../game/store';
import { useCoarsePointer } from '../hooks/useCoarsePointer';
import type { FlightInput } from '../game/flight';

interface Props { onInput: (input: FlightInput) => void; forceVisible?: boolean }

export function TouchControls({ onInput, forceVisible = false }: Props) {
  const state = useGame((g) => g.state);
  const send = useGame((g) => g.send);
  const coarse = useCoarsePointer();
  const held = useRef<FlightInput>({ dx: 0, dy: 0 });

  if (!coarse && !forceVisible) return null;
  if (state === 'intro' || state === 'booking' || state === 'confirmed') return null;

  const press = (dx: -1 | 0 | 1, dy: -1 | 0 | 1) => () => { held.current = { dx, dy }; onInput(held.current); };
  const release = () => { held.current = { dx: 0, dy: 0 }; onInput(held.current); };

  const dirs: { label: string; dx: -1 | 0 | 1; dy: -1 | 0 | 1; area: string; glyph: string }[] = [
    { label: 'fly up', dx: 0, dy: 1, area: '1 / 2', glyph: '▲' },
    { label: 'fly left', dx: -1, dy: 0, area: '2 / 1', glyph: '◀' },
    { label: 'fly right', dx: 1, dy: 0, area: '2 / 3', glyph: '▶' },
    { label: 'fly down', dx: 0, dy: -1, area: '3 / 2', glyph: '▼' },
  ];

  return (
    <>
      <div className="bb-dpad" role="group" aria-label="Flight controls">
        {dirs.map((d) => (
          <button key={d.label} aria-label={d.label} style={{ gridArea: d.area }}
            onPointerDown={press(d.dx, d.dy)} onPointerUp={release} onPointerLeave={release}>
            {d.glyph}
          </button>
        ))}
      </div>
      <button className="bb-land" disabled={state !== 'approaching'}
        onClick={() => send({ type: 'LAND' })}>
        Land
      </button>
    </>
  );
}
