import { useEffect, useRef, useState } from 'react';
import { useGame } from '../game/store';
import { DESTINATIONS } from '../data/destinations';
import { AGENCY } from '../data/agency';
import { ACHIEVEMENTS } from '../data/achievements';
import { useAchievements } from '../game/achievements';
import { loadMyBooking } from '../bookings/myBooking';
import { formatTime } from '../bookings/mapping';

const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

export function SideNav() {
  const [open, setOpen] = useState(false);
  const flyTo = useGame((g) => g.flyTo);
  const send = useGame((g) => g.send);
  const booking = open ? loadMyBooking() : null;
  const unlockedIds = useAchievements((g) => g.unlocked);
  // Trophy shelf, not a checklist (design §5): only what's already earned ever renders —
  // no locked/"???" slots, no count of how many exist or remain.
  const earnedAchievements = ACHIEVEMENTS.filter((a) => unlockedIds.includes(a.id));
  const drawerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const focusables = () => drawerRef.current?.querySelectorAll<HTMLElement>('button, a[href]') ?? [];
    focusables()[0]?.focus();

    // Capture phase so this runs before the game's own window-level keydown
    // handler (useKeyboardControls): Esc must only close the drawer, never
    // also take off, and flight keys must not reach the game while browsing.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
        return;
      }
      if (e.key !== 'Tab') {
        e.stopPropagation();
        return;
      }
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [open]);

  return (
    <>
      <button className="bb-navtab" aria-controls="bb-drawer" onClick={() => setOpen(true)} aria-expanded={open}>Menu</button>
      {open && (
        <>
          <button className="bb-scrim" aria-label="Close menu" onClick={() => setOpen(false)} />
          <nav id="bb-drawer" ref={drawerRef} className="bb-card bb-drawer" aria-label="Site menu">
            <b style={{ fontSize: 18 }}>🚁 Nalu Surf Travel</b>
            <span className="sect">Destinations</span>
            <p className="bb-caption" style={{ margin: '0 8px 4px' }}>Pick one and I'll fly us there</p>
            {DESTINATIONS.map((d) => (
              <button key={d.id} className="link" onClick={() => { flyTo(d.id); setOpen(false); }}>
                {d.emoji} {d.name}
              </button>
            ))}
            <span className="sect">The agency</span>
            <p style={{ margin: '4px 8px', fontSize: 14, lineHeight: 1.5 }}>{AGENCY.about}</p>
            <span className="sect">My booking</span>
            {booking ? (
              <p style={{ margin: '4px 8px', fontSize: 14 }}>
                🤙 {new Date(booking.startISO).toDateString()} · {formatTime(booking.startISO, TZ)}
                {booking.destName ? <><br />about {booking.destName}</> : null}
              </p>
            ) : (
              <button className="link" onClick={() => {
                const { state } = useGame.getState();
                if (state === 'intro') send({ type: 'INTRO_DONE' });
                else if (state === 'confirmed') send({ type: 'DONE' });
                send({ type: 'OPEN_BOOKING' });
                setOpen(false);
              }}>
                📅 Book a session
              </button>
            )}
            <span className="sect">Achievements</span>
            {earnedAchievements.length === 0 ? (
              <p style={{ margin: '4px 8px', fontSize: 14 }}>No badges yet — explore to discover secrets.</p>
            ) : (
              <ul style={{ margin: '4px 0', padding: '0 8px 0 24px' }}>
                {earnedAchievements.map((a) => (
                  <li key={a.id} style={{ fontSize: 14, marginBottom: 4 }}>
                    {a.emoji} <b>{a.title}</b> — {a.earnedHint}
                  </li>
                ))}
              </ul>
            )}
            <p className="bb-caption" style={{ margin: '0 8px 4px' }}>Keep exploring — there are secrets to find.</p>
            <p className="bb-caption" style={{ marginTop: 'auto', padding: '0 8px' }}>
              {AGENCY.email}<br />{AGENCY.phone}
            </p>
          </nav>
        </>
      )}
    </>
  );
}
