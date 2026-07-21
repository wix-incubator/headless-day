import { useEffect, useRef, useState } from 'react';

type Cow = { name: string; slug: string; portrait?: string; mood: string };

// Deterministic mock "bouquets received" — Buttercup is always winning.
function received(name: string): number {
  if (name === 'Buttercup') return 142;
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 1000;
  return 24 + (h % 88); // 24..111
}

const GREENS = [
  { name: 'Wildflowers', pct: 100 },
  { name: 'Clover', pct: 82 },
  { name: 'Dandelion', pct: 64 },
  { name: 'Premium timothy', pct: 47 },
  { name: 'Fresh ryegrass', pct: 31 },
];

// Contentment Index — 12 monthly points, gently rising.
const INDEX = [61, 63, 62, 66, 68, 67, 71, 74, 73, 78, 82, 86];

export default function HerdLeaderboard({ cows }: { cows: Cow[] }) {
  const ranked = [...cows].map((c) => ({ ...c, n: received(c.name) })).sort((a, b) => b.n - a.n);
  const max = Math.max(...ranked.map((c) => c.n), 1);

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 20 }}>
        {/* Bouquets received per cow */}
        <section className="card" style={{ padding: '1.4rem 1.5rem' }}>
          <h3 style={{ marginTop: 0 }}>Bouquets received</h3>
          <p className="muted" style={{ fontSize: '0.85rem', marginTop: '-0.5rem' }}>This season · per cow</p>
          <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
            {ranked.map((c, i) => (
              <div key={c.slug} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 20, fontWeight: 700, color: i === 0 ? 'var(--color-gold)' : 'var(--color-text-muted)' }}>{i + 1}</span>
                {c.portrait
                  ? <img src={c.portrait} alt="" width={30} height={30} style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover' }} />
                  : <span style={{ width: 30, height: 30, borderRadius: '50%', background: '#E6E1D2', display: 'inline-block' }} />}
                <span style={{ width: 96, fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
                <span style={{ flex: 1, height: 12, background: 'var(--color-border)', borderRadius: 999, overflow: 'hidden' }}>
                  <Bar pct={(c.n / max) * 100} highlight={i === 0} />
                </span>
                <span style={{ width: 34, textAlign: 'right', fontWeight: 700, fontSize: '0.85rem' }}>{c.n}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Most-gifted greens */}
        <section className="card" style={{ padding: '1.4rem 1.5rem' }}>
          <h3 style={{ marginTop: 0 }}>Most-gifted greens</h3>
          <p className="muted" style={{ fontSize: '0.85rem', marginTop: '-0.5rem' }}>This month</p>
          <div style={{ display: 'grid', gap: 12, marginTop: 14 }}>
            {GREENS.map((g) => (
              <div key={g.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', fontWeight: 600, marginBottom: 3 }}>
                  <span>{g.name}</span>
                </div>
                <span style={{ display: 'block', height: 10, background: 'var(--color-border)', borderRadius: 999, overflow: 'hidden' }}>
                  <Bar pct={g.pct} accent />
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Contentment Index trend */}
      <section className="card" style={{ padding: '1.4rem 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <h3 style={{ marginTop: 0, marginBottom: 2 }}>Contentment Index</h3>
            <p className="muted" style={{ fontSize: '0.85rem', margin: 0 }}>Herd-wide · trailing 12 months</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="price" style={{ fontSize: '1.8rem' }}>{INDEX[INDEX.length - 1]}</div>
            <div style={{ color: 'var(--color-primary)', fontWeight: 700, fontSize: '0.82rem' }}>▲ contentedly up</div>
          </div>
        </div>
        <Sparkline data={INDEX} />
      </section>
    </div>
  );
}

function Bar({ pct, highlight, accent }: { pct: number; highlight?: boolean; accent?: boolean }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(pct), 60);
    return () => clearTimeout(t);
  }, [pct]);
  const bg = highlight ? 'var(--color-gold)' : accent ? 'var(--color-accent)' : 'var(--color-primary)';
  return <span style={{ display: 'block', height: '100%', width: `${w}%`, background: bg, borderRadius: 999, transition: 'width 1s cubic-bezier(.65,0,.35,1)' }} />;
}

function Sparkline({ data }: { data: number[] }) {
  const ref = useRef<SVGPathElement>(null);
  const W = 720, H = 160, P = 10;
  const min = Math.min(...data), max = Math.max(...data);
  const pts = data.map((v, i) => {
    const x = P + (i / (data.length - 1)) * (W - 2 * P);
    const y = H - P - ((v - min) / (max - min || 1)) * (H - 2 * P);
    return [x, y];
  });
  const d = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ');
  const area = `${d} L${pts[pts.length - 1][0]},${H - P} L${pts[0][0]},${H - P} Z`;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const len = el.getTotalLength();
    el.style.strokeDasharray = `${len}`;
    el.style.strokeDashoffset = reduce ? '0' : `${len}`;
    if (reduce) return;
    requestAnimationFrame(() => {
      el.style.transition = 'stroke-dashoffset 1.6s ease';
      el.style.strokeDashoffset = '0';
    });
  }, []);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="auto" role="img" aria-label="Contentment Index trending upward over twelve months" style={{ marginTop: 14 }}>
      <defs>
        <linearGradient id="ci-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(62,90,59,0.22)" />
          <stop offset="100%" stopColor="rgba(62,90,59,0)" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#ci-fill)" />
      <path ref={ref} d={d} fill="none" stroke="var(--color-primary)" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={i === pts.length - 1 ? 5 : 2.5} fill={i === pts.length - 1 ? 'var(--color-gold)' : 'var(--color-primary)'} />)}
    </svg>
  );
}
