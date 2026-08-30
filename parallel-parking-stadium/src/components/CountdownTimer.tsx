import { useEffect, useState } from 'react';

function parts(targetMs: number) {
  let diff = Math.max(0, targetMs - Date.now());
  const d = Math.floor(diff / 86400000);
  diff -= d * 86400000;
  const h = Math.floor(diff / 3600000);
  diff -= h * 3600000;
  const m = Math.floor(diff / 60000);
  diff -= m * 60000;
  const s = Math.floor(diff / 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return [
    { v: pad(d), l: 'Days' },
    { v: pad(h), l: 'Hours' },
    { v: pad(m), l: 'Mins' },
    { v: pad(s), l: 'Secs' },
  ];
}

export default function CountdownTimer({ targetIso }: { targetIso: string }) {
  const targetMs = new Date(targetIso).getTime();
  const [cells, setCells] = useState(() => parts(targetMs));

  useEffect(() => {
    const id = setInterval(() => setCells(parts(targetMs)), 1000);
    return () => clearInterval(id);
  }, [targetMs]);

  return (
    <div style={{ display: 'flex', gap: 10 }}>
      {cells.map((c) => (
        <div
          key={c.l}
          style={{
            flex: 1,
            minWidth: 62,
            background: 'var(--bg-2)',
            border: '2px solid var(--yellow)',
            boxShadow: 'var(--shadow-md)',
            padding: '14px 8px',
            textAlign: 'center',
          }}
        >
          <div
            className="dk"
            style={{ fontSize: 'clamp(30px,5vw,46px)', color: 'var(--gold)', lineHeight: 1, textShadow: '2px 2px 0 rgba(25,27,38,.16)' }}
          >
            {c.v}
          </div>
          <div
            className="lbl"
            style={{ fontSize: 10, color: 'var(--ink-dim)', marginTop: 8 }}
          >
            {c.l}
          </div>
        </div>
      ))}
    </div>
  );
}
