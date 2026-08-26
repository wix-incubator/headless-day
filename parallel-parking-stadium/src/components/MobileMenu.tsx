import { useState } from 'react';

type Link = { id: string; label: string; href: string };

const EXTRA: Link[] = [
  { id: 'about', label: 'The Arena', href: '/about' },
  { id: 'visit', label: 'Visit', href: '/visit' },
];

export default function MobileMenu({ page, links }: { page: string; links: Link[] }) {
  const [open, setOpen] = useState(false);
  const all = [...links, ...EXTRA];

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Menu"
        aria-expanded={open}
        style={{
          fontFamily: 'var(--font-arcade)',
          fontSize: 11,
          textTransform: 'uppercase',
          background: 'var(--yellow)',
          color: 'var(--ink)',
          border: '2px solid var(--ink)',
          boxShadow: 'var(--shadow-sm)',
          padding: '10px 12px',
          cursor: 'pointer',
        }}
      >
        {open ? '✕' : '☰'} Menu
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: '100%',
            background: 'var(--bg-2)',
            borderTop: '3px solid var(--yellow)',
            borderBottom: '3px solid var(--grid)',
            padding: '10px 16px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            zIndex: 60,
          }}
        >
          {all.map((l) => (
            <a
              key={l.id}
              href={l.href}
              style={{
                fontFamily: 'var(--font-arcade)',
                fontSize: 12,
                textTransform: 'uppercase',
                padding: '13px 4px',
                color: l.id === page ? 'var(--gold)' : 'var(--ink)',
                boxShadow: l.id === page ? 'inset 4px 0 0 0 var(--yellow)' : 'none',
                paddingLeft: l.id === page ? 12 : 4,
              }}
              aria-current={l.id === page ? 'page' : undefined}
            >
              {l.label}
            </a>
          ))}
          <a
            href="/tickets"
            style={{
              marginTop: 8,
              background: 'var(--yellow)',
              color: 'var(--ink)',
              fontFamily: 'var(--font-arcade)',
              fontSize: 12,
              textTransform: 'uppercase',
              padding: 14,
              border: '2px solid var(--ink)',
              boxShadow: 'var(--shadow-ink)',
              textAlign: 'center',
            }}
          >
            ▶ Tickets
          </a>
        </div>
      )}
    </>
  );
}
