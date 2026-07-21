import { useGame } from '../game/store';
import { loadMyBooking } from '../bookings/myBooking';
import { formatTime } from '../bookings/mapping';

const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

export function ConfirmedCard() {
  const send = useGame((g) => g.send);
  const b = loadMyBooking();
  return (
    <div className="bb-card bb-center" role="dialog" aria-label="Booking confirmed">
      <div className="bb-stamp">🤙</div>
      <h2>You're booked!</h2>
      {b && (
        <p>
          <b>{new Date(b.startISO).toDateString()} · {formatTime(b.startISO, TZ)}</b>
          <br />30 min video call with your surf agent{b.destName ? ` — about ${b.destName}` : ''}
        </p>
      )}
      <p className="bb-caption">Saved under “My booking” in the menu · the agent sees it in their dashboard</p>
      <button className="bb-btn bb-btn--sun" onClick={() => send({ type: 'DONE' })}>Back to the skies</button>
    </div>
  );
}
