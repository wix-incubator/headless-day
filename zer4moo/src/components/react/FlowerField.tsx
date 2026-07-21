import { useState } from 'react';
import type { Stem } from '../../lib/stems';

const FIELD_SRC = '/field.png';

// One generated meadow; small point hotspots sit over the foreground blooms.
// Repeats are fine — several of the same kind in different spots.
type Hot = { id: string; x: number; y: number };
const HOTSPOTS: Hot[] = [
  // foreground blooms
  { id: 'wheat', x: 5, y: 49 },
  { id: 'daisy', x: 6, y: 79 },
  { id: 'daisy', x: 13, y: 71 },
  { id: 'poppy', x: 24, y: 52 },
  { id: 'poppy', x: 30, y: 63 },
  { id: 'clover', x: 35, y: 79 },
  { id: 'daisy', x: 42, y: 50 },
  { id: 'dandelion', x: 53, y: 73 },
  { id: 'buttercup', x: 63, y: 42 },
  { id: 'buttercup', x: 64, y: 76 },
  { id: 'blush', x: 72, y: 61 },
  { id: 'blush', x: 76, y: 74 },
  { id: 'harebell', x: 87, y: 66 },
  { id: 'lavender', x: 95, y: 71 },
  // mid / background
  { id: 'clover', x: 18, y: 27 },
  { id: 'dandelion', x: 12, y: 16 },
  { id: 'poppy', x: 37, y: 15 },
  { id: 'dandelion', x: 68, y: 15 },
  { id: 'daisy', x: 85, y: 12 },
  { id: 'lavender', x: 95, y: 15 },
  { id: 'blush', x: 78, y: 26 },
];
const money = (n: number) => `₪${n}`;

export default function FlowerField({
  stems, counts, onPick, atMax, total, n,
}: {
  stems: Stem[]; counts: Record<string, number>; onPick: (id: string) => void;
  atMax: boolean; total: number; n: number;
}) {
  const byId = Object.fromEntries(stems.map((s) => [s.id, s])) as Record<string, Stem>;
  const [pluck, setPluck] = useState<number | null>(null);
  const [ping, setPing] = useState<number | null>(null);

  const click = (i: number, id: string) => {
    if (atMax) return;
    onPick(id);
    setPluck(i); setPing(i);
    setTimeout(() => setPluck((p) => (p === i ? null : p)), 420);
    setTimeout(() => setPing((p) => (p === i ? null : p)), 760);
  };

  return (
    <div className="fieldband">
      <div className="fieldband__stage">
      <img className="fieldband__img" src={FIELD_SRC}
        alt="A watercolor wildflower meadow — tap a flower to add it to your bouquet." />
      {HOTSPOTS.map((h, i) => {
        const s = byId[h.id];
        if (!s) return null;
        return (
          <button key={i} type="button" className={`fs-hot${pluck === i ? ' pluck' : ''}`}
            style={{ left: `${h.x}%`, top: `${h.y}%` }} onClick={() => click(i, h.id)} disabled={atMax}
            aria-label={`Add ${s.name}, ₪${s.price}`}>
            <span className="fs-dot" aria-hidden="true">+</span>
            <span className="fs-tip">{s.name} · ₪{s.price}</span>
            {ping === i && <span className="fs-ping">+1</span>}
          </button>
        );
      })}
      </div>
    </div>
  );
}
