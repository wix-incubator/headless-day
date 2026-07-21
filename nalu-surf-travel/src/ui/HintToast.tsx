import { useEffect, useState } from 'react';
import { useGame } from '../game/store';
import { destinationById, type Destination } from '../data/destinations';
import { useCoarsePointer } from '../hooks/useCoarsePointer';

// Hides at t=0 of the landing choreography with a 150ms fade (art-direction §4a) rather
// than vanishing the instant `approaching` ends — so keep the last destination rendered
// (with a "hiding" class) for one more tick instead of unmounting immediately.
const HIDE_FADE_MS = 150;

export function HintToast() {
  const state = useGame((g) => g.state);
  const destId = useGame((g) => g.activeDestId);
  const coarse = useCoarsePointer();
  const dest = destId ? destinationById(destId) : undefined;
  const [shown, setShown] = useState<Destination | undefined>(undefined);
  const [hiding, setHiding] = useState(false);

  useEffect(() => {
    if (state === 'approaching' && dest) {
      setShown(dest);
      setHiding(false);
      return;
    }
    setHiding(true);
    const id = setTimeout(() => setShown(undefined), HIDE_FADE_MS);
    return () => clearTimeout(id);
  }, [state, dest]);

  if (!shown) return null;
  return (
    <div className={`bb-card bb-toast${hiding ? ' bb-toast--hiding' : ''}`} role="status">
      {coarse
        ? <>{shown.emoji} Tap <b>Land</b> to land at <b>{shown.name}</b></>
        : <>{shown.emoji} Press <span className="bb-key">Space</span> to land at <b>{shown.name}</b></>}
    </div>
  );
}

export function ControlsChip() {
  const state = useGame((g) => g.state);
  const coarse = useCoarsePointer();
  const [faded, setFaded] = useState(false);
  useEffect(() => {
    if (state !== 'flying') return;
    const id = setTimeout(() => setFaded(true), 6000);
    return () => clearTimeout(id);
  }, [state]);
  if (coarse || state !== 'flying' || faded) return null;
  return (
    <div className="bb-card bb-chip" role="note">
      <span className="bb-key">←</span><span className="bb-key">→</span>
      <span className="bb-key">↑</span><span className="bb-key">↓</span> fly ·{' '}
      <span className="bb-key">Space</span> land
    </div>
  );
}
