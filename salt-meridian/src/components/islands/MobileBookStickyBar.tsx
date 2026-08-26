import { useEffect, useState } from 'react';

/**
 * Above-fold, per-visitor conversion control. Hydrated `client:load` so it is
 * tappable immediately. Mobile only; reveals after the hero scrolls past so it
 * never covers the hero CTA on first paint.
 */
export default function MobileBookStickyBar({ phoneHref }: { phoneHref: string }) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const onScroll = () => setShown(window.scrollY > 420);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className={`mobile-sticky-bar ${shown ? 'is-shown' : ''}`} role="region" aria-label="Book or call">
      <a href={`tel:${phoneHref}`} className="btn-ghost btn-bar" aria-label="Call the harbor line">
        Call
      </a>
      <a href="/reservations" className="btn-primary btn-bar">
        Request a table
      </a>
    </div>
  );
}
