import { useEffect, useState } from 'react';

// Above-fold conversion control; appears after the user scrolls past the hero.
export default function MobileStickyBar({ label = 'Build a bouquet', href = '/shop' }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 520);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <div className={`sticky-bar ${show ? 'show' : ''}`}>
      <a className="btn btn-primary btn-block btn-lg" href={href}>{label}</a>
    </div>
  );
}
