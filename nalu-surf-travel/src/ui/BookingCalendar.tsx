import { useCallback, useEffect, useState } from 'react';
import { useGame } from '../game/store';
import { destinationById } from '../data/destinations';
import { AGENCY } from '../data/agency';
import { getService, getAvailability, createBooking, SlotConflictError } from '../bookings/api';
import { formatTime, type DaySlots, type Slot } from '../bookings/mapping';
import { saveMyBooking } from '../bookings/myBooking';
import { NALU } from './dialogue';

type Phase = 'loading' | 'error' | 'empty' | 'ready' | 'submitting';
const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

export function BookingCalendar() {
  const send = useGame((g) => g.send);
  const returnTo = useGame((g) => g.bookingReturnTo);
  const destId = useGame((g) => g.activeDestId);
  const dest = destId ? destinationById(destId) : undefined;

  const [phase, setPhase] = useState<Phase>('loading');
  const [days, setDays] = useState<DaySlots[]>([]);
  const [dayISO, setDayISO] = useState<string | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setPhase('loading');
    setNotice(null);
    try {
      const svc = await getService();
      const from = new Date();
      const to = new Date(from.getTime() + 30 * 24 * 3600 * 1000);
      const result = await getAvailability(svc.id, from.toISOString(), to.toISOString(), TZ);
      setDays(result);
      setPhase(result.length ? 'ready' : 'empty');
    } catch {
      setPhase('error');
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const submit = async () => {
    if (!slot || !name.trim() || !/.+@.+\..+/.test(email)) {
      setNotice('I need your name and a real email to book you in!');
      return;
    }
    setPhase('submitting');
    try {
      const { bookingId } = await createBooking(slot, { name: name.trim(), email: email.trim() });
      saveMyBooking({ bookingId, startISO: slot.startISO, destName: dest?.name });
      send({ type: 'BOOKED' });
    } catch (e) {
      if (e instanceof SlotConflictError) {
        setSlot(null);
        await load();
        // After load(): it clears any notice, so set the conflict message last
        // or React 18 batching folds set-then-clear into a no-op render.
        setNotice('Someone just caught that one — pick another!');
      } else {
        setPhase('ready');
        setNotice("Choppy connection! I couldn't fetch the calendar — try again?");
      }
    }
  };

  const selectedDay = days.find((d) => d.dateISO === dayISO) ?? null;

  return (
    <div className="bb-card bb-modal" role="dialog" aria-modal="true" aria-label="Book with your surf agent">
      <span className="bb-caption" style={{ color: 'var(--coral-deep)' }}>{NALU}: “Let's find a time!”</span>
      <h2>Book with your surf agent</h2>
      <p className="bb-caption">
        Trip-planning session · 30 min · online video call{dest ? ` · about ${dest.name}` : ''}
      </p>

      {phase === 'loading' && <p>Checking the agent's calendar…</p>}

      {phase === 'error' && (
        <p className="bb-error" role="alert">
          Choppy connection! I couldn't fetch the calendar — try again?{' '}
          <button className="bb-btn bb-btn--sun" onClick={() => void load()}>Try again</button>
        </p>
      )}

      {phase === 'empty' && (
        <p role="alert">No open waves in the next month — message the agent instead:{' '}
          <a href={`mailto:${AGENCY.email}`}>{AGENCY.email}</a>
        </p>
      )}

      {(phase === 'ready' || phase === 'submitting') && (
        <div className="bb-cols">
          <div>
            <div className="bb-grid" role="group" aria-label="Days with availability">
              {days.map((d) => (
                <button key={d.dateISO} className="bb-day bb-day--has"
                  aria-pressed={d.dateISO === dayISO}
                  onClick={() => { setDayISO(d.dateISO); setSlot(null); }}>
                  {Number(d.dateISO.slice(-2))}
                </button>
              ))}
            </div>
          </div>
          <div>
            {selectedDay && (
              <div role="group" aria-label="Open times">
                {selectedDay.slots.map((s) => (
                  <button key={s.startISO} className="bb-slot"
                    aria-pressed={slot?.startISO === s.startISO}
                    onClick={() => setSlot(s)}>
                    {formatTime(s.startISO, TZ)}
                  </button>
                ))}
              </div>
            )}
            <label>Your name
              <input className="bb-field" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label>Email
              <input className="bb-field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            {notice && <p className="bb-error" role="alert">{notice}</p>}
            <button className="bb-btn" disabled={phase === 'submitting' || !slot} onClick={() => void submit()}>
              Confirm booking
            </button>
          </div>
        </div>
      )}

      <p className="bb-caption">Real availability via Wix Bookings · Esc to close</p>
      <button className="bb-btn bb-btn--sun"
        onClick={() => send({ type: 'CLOSE_BOOKING', returnTo })}>Close</button>
    </div>
  );
}
