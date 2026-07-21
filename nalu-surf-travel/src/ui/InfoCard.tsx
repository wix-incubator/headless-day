import { useEffect, useRef, useState } from 'react';
import { useGame } from '../game/store';
import { destinationById } from '../data/destinations';
import { DESTINATION_PHOTOS } from '../data/photos';
import { useReducedMotion } from '../hooks/useReducedMotion';

// Touchdown first, paperwork second (art-direction §4a): the card mounts only after the
// landing choreography's dust has settled, not the instant the game state flips to `landed`.
const CARD_DELAY_MS = 1050;
const CARD_DELAY_REDUCED_MS = 300;
// Takeoff (§4b): the card slides out at t=0, the reverse of its entrance, rather than
// vanishing instantly — `activeDestId` (and so `dest`) survives the TAKE_OFF transition,
// so the exiting card still has its destination to render.
const EXIT_MS = 200;

export function InfoCard() {
  const state = useGame((g) => g.state);
  const destId = useGame((g) => g.activeDestId);
  const send = useGame((g) => g.send);
  const reducedMotion = useReducedMotion();
  const dest = destId ? destinationById(destId) : undefined;
  const [mounted, setMounted] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const wasMounted = useRef(false);

  useEffect(() => {
    if (state === 'landed') {
      setLeaving(false);
      const id = setTimeout(() => { wasMounted.current = true; setMounted(true); }, reducedMotion ? CARD_DELAY_REDUCED_MS : CARD_DELAY_MS);
      return () => clearTimeout(id);
    }
    if (wasMounted.current) {
      wasMounted.current = false;
      setLeaving(true);
      const id = setTimeout(() => { setMounted(false); setLeaving(false); }, reducedMotion ? 0 : EXIT_MS);
      return () => clearTimeout(id);
    }
    setMounted(false);
  }, [state, reducedMotion]);

  if (!dest || (!mounted && !leaving)) return null;

  const photo = DESTINATION_PHOTOS[dest.id];

  return (
    <section className={`bb-card bb-info${leaving ? ' bb-info--leaving' : ''}`} aria-label={`About ${dest.name}`}>
      {photo && (
        <figure className="bb-info__photo">
          <img src={photo.src} alt={photo.alt} loading="lazy" />
          <figcaption className="bb-caption">{photo.credit}</figcaption>
        </figure>
      )}
      <h2>{dest.name} {dest.emoji}</h2>
      <div>
        <span className="bb-pill">{dest.bestWindow.months}</span>
        <span className="bb-pill bb-pill--warm">{dest.bestWindow.windNotes}</span>
        <span className="bb-pill bb-pill--warm">{dest.bestWindow.tideNotes}</span>
      </div>
      <p className="bb-info__blurb">{dest.blurb}</p>
      <ul>
        {dest.spots.map((s) => <li key={s.name}><b>{s.name}</b> — {s.note}</li>)}
      </ul>
      <p className="bb-caption">Skill: {dest.skillLevel} · Water: {dest.waterTemp} · {dest.country}</p>
      <button className="bb-btn cta" onClick={() => send({ type: 'OPEN_BOOKING' })}>
        Plan this trip
      </button>
      <button className="bb-btn bb-btn--sun" onClick={() => send({ type: 'TAKE_OFF' })}>
        Take off (Space)
      </button>
    </section>
  );
}
