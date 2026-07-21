import { useEffect, useState } from 'react';
import { cartCount, onCartChange } from '../../lib/cart';

// Reads browser-only state → mounted with client:only="react" (caveat A4).
export default function CartBadge() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    setCount(cartCount());
    return onCartChange(() => setCount(cartCount()));
  }, []);
  return (
    <a
      href="/cart"
      aria-label={`Cart, ${count} arrangement${count === 1 ? '' : 's'}`}
      style={{
        position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 6,
        textDecoration: 'none', fontWeight: 600, color: 'var(--color-primary)',
      }}
    >
      <span aria-hidden="true" style={{ fontSize: '1.15rem' }}>🧺</span>
      {count > 0 && (
        <span
          style={{
            minWidth: 20, height: 20, padding: '0 5px', borderRadius: 999,
            background: 'var(--color-accent)', color: '#4a2b2e', fontSize: '0.72rem',
            fontWeight: 700, display: 'inline-grid', placeItems: 'center', lineHeight: 1,
          }}
        >
          {count}
        </span>
      )}
    </a>
  );
}
