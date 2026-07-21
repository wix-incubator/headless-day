import { DESTINATIONS } from '../data/destinations';
import { DESTINATION_PHOTOS } from '../data/photos';
import { AGENCY } from '../data/agency';
import { BookingCalendar } from './BookingCalendar';
import { ConfirmedCard } from './ConfirmedCard';
import { useGame } from '../game/store';
import { useEffect } from 'react';

export function FallbackView() {
  const state = useGame((g) => g.state);
  const send = useGame((g) => g.send);

  // No 3D globe here, so the fallback owns getting into 'booking' itself:
  // skip the intro, and hop back in whenever the machine lands anywhere else
  // (closed the calendar, or finished a booking) so there's always something to do.
  useEffect(() => {
    if (state === 'booking' || state === 'confirmed') return;
    if (state === 'intro') send({ type: 'INTRO_DONE' });
    else send({ type: 'OPEN_BOOKING' });
  }, [state, send]);

  return (
    <div className="bb-fallback">
      <h1>Nalu Surf Travel 🚁</h1>
      <p>Your browser can't fly the 3D globe, but the surf trips are all still here.</p>
      {DESTINATIONS.map((d) => (
        <section key={d.id} className="bb-card" style={{ margin: '12px 0' }}>
          <img
            src={DESTINATION_PHOTOS[d.id].src}
            alt={DESTINATION_PHOTOS[d.id].alt}
            loading="lazy"
            style={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', borderRadius: '15px', display: 'block' }}
          />
          <h2>{d.name} {d.emoji}</h2>
          <p className="bb-info__blurb">{d.blurb}</p>
          <p>{d.bestWindow.months} · {d.bestWindow.windNotes} · {d.bestWindow.tideNotes}</p>
          <ul>{d.spots.map((s) => <li key={s.name}><b>{s.name}</b> — {s.note}</li>)}</ul>
          <p className="bb-caption">Skill: {d.skillLevel} · Water: {d.waterTemp}</p>
        </section>
      ))}
      {state === 'confirmed' ? <ConfirmedCard /> : state === 'booking' ? <BookingCalendar /> : null}
      <p className="bb-caption">Questions? {AGENCY.email} · {AGENCY.phone}</p>
    </div>
  );
}
