import { useEffect, useRef, useState } from 'react';
import { useMemo } from 'react';
import { sideCells, SIDE_W, SIDE_H, CARS } from '../lib/carSprite';

// render the shared SIDE-PROFILE pixel car as SVG rects, centred at (cx,cy) —
// it's a side-view replay. Memoised on (palette,s) so the animating van only
// re-applies a translate.
function PixelCarSvg({ cx, cy, s, palette }: { cx: number; cy: number; s: number; palette: keyof typeof CARS }) {
  const rects = useMemo(() => {
    const ox = (SIDE_W / 2) * s;
    const oy = (SIDE_H / 2) * s;
    return sideCells(CARS[palette]).map((p, i) => (
      <rect key={i} x={p.x * s - ox} y={p.y * s - oy} width={s + 0.5} height={s + 0.5} fill={p.color} />
    ));
  }, [palette, s]);
  return (
    <g transform={`translate(${cx} ${cy})`} shapeRendering="crispEdges">
      {rects}
    </g>
  );
}

// waypoints: [t, x, y, angle] — the van's path into slot 7
// the van eases in from the right and settles in the gap (side view)
const VAN_START = 1080;
const VAN_END = 605;

const TAPE = [
  { l: 'The space', v: '5.10 M' },
  { l: 'The van', v: '4.99 M' },
  { l: 'Touches', v: '00' },
  { l: 'Clock', v: '8.4 S' },
];

const DURATION = 4.4; // seconds, one continuous motion

export default function ReplayPlayer() {
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const tRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number | null>(null);
  const reducedRef = useRef(false);

  const set = (v: number) => {
    tRef.current = v;
    setT(v);
  };

  const loop = (ts: number) => {
    if (lastRef.current == null) lastRef.current = ts;
    const dt = (ts - lastRef.current) / 1000;
    lastRef.current = ts;
    const next = Math.min(1, tRef.current + dt / DURATION);
    set(next);
    if (next >= 1) {
      setPlaying(false);
      return;
    }
    rafRef.current = requestAnimationFrame(loop);
  };

  const play = () => {
    if (reducedRef.current) {
      set(1);
      return;
    }
    if (tRef.current >= 1) set(0);
    lastRef.current = null;
    setPlaying(true);
    rafRef.current = requestAnimationFrame(loop);
  };

  const pause = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    lastRef.current = null;
    setPlaying(false);
  };

  useEffect(() => {
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion:reduce)').matches;
    reducedRef.current = reduced;
    if (reduced) {
      set(1);
    } else {
      const id = setTimeout(() => play(), 700);
      return () => {
        clearTimeout(id);
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const vanX = (VAN_START + (VAN_END - VAN_START) * t).toFixed(1);
  const clearance = Math.round(11 * Math.max(0, Math.min(1, (t - 0.5) / 0.5)));

  return (
    <div className="replay-grid">
      <style
        dangerouslySetInnerHTML={{
          __html: `.replay-grid{display:grid;grid-template-columns:1fr;gap:22px;align-items:start}
@media(min-width:860px){.replay-grid{grid-template-columns:1.5fr 1fr}}`,
        }}
      />

      {/* the deck */}
      <div
        style={{
          background: '#181b24',
          border: '2px solid var(--ink)',
          boxShadow: 'var(--shadow)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 14px',
            borderBottom: '1px solid rgba(255,255,255,.08)',
          }}
        >
          <span className="lbl" style={{ fontSize: 11, color: 'rgba(255,255,255,.6)' }}>
            Side view · The 11cm park
          </span>
          <span className="lbl" style={{ fontSize: 11, color: '#FFD60A' }}>
            {Math.round(t * 100)}%
          </span>
        </div>

        <svg viewBox="0 0 1200 560" style={{ display: 'block', width: '100%', background: '#222736' }}>
          {/* wall behind */}
          <rect x="0" y="0" width="1200" height="410" fill="#2b3142" />
          <g stroke="#ffffff" strokeOpacity=".05">
            <line x1="0" y1="120" x2="1200" y2="120" />
            <line x1="0" y1="240" x2="1200" y2="240" />
            <line x1="300" y1="0" x2="300" y2="410" />
            <line x1="600" y1="0" x2="600" y2="410" />
            <line x1="900" y1="0" x2="900" y2="410" />
          </g>
          {/* curb + road */}
          <rect x="0" y="410" width="1200" height="150" fill="#3a4254" />
          <line x1="0" y1="410" x2="1200" y2="410" stroke="#ffd60a" strokeOpacity=".3" strokeWidth="3" />
          {/* parked cars with the gap between them */}
          <PixelCarSvg cx={360} cy={346} s={8} palette="slate" />
          <PixelCarSvg cx={850} cy={346} s={8} palette="teal" />
          {/* the gap dimension (5.10m) */}
          <line x1="439" y1="150" x2="771" y2="150" stroke="#ffd60a" strokeWidth="2" />
          <line x1="439" y1="138" x2="439" y2="162" stroke="#ffd60a" strokeWidth="2" />
          <line x1="771" y1="138" x2="771" y2="162" stroke="#ffd60a" strokeWidth="2" />
          <rect x="567" y="128" width="76" height="28" rx="2" fill="#222736" stroke="#ffd60a" />
          <text x="605" y="148" textAnchor="middle" className="dk" fill="#ffd60a" fontSize="18">5.10M</text>
          {/* the legendary van easing into the gap */}
          <PixelCarSvg cx={Number(vanX)} cy={346} s={8} palette="van" />
        </svg>

        {/* controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '14px 16px',
            borderTop: '1px solid rgba(255,255,255,.08)',
          }}
        >
          <button
            onClick={() => (playing ? pause() : play())}
            style={{
              flex: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: '#FFD60A',
              color: '#16191c',
              fontFamily: 'var(--font-arcade)',
              fontWeight: 800,
              fontSize: 13,
              textTransform: 'uppercase',
              letterSpacing: '.04em',
              padding: '11px 16px',
              border: 'none',
              borderRadius: 2,
              cursor: 'pointer',
            }}
          >
            {playing ? '❚❚ Pause' : '▶ Play'}
          </button>
          <input
            type="range"
            min={0}
            max={1000}
            value={Math.round(t * 1000)}
            onChange={(e) => {
              pause();
              set(Number(e.target.value) / 1000);
            }}
            style={{ flex: 1 }}
            aria-label="Scrub replay"
          />
          <button
            onClick={() => {
              set(0);
              play();
            }}
            style={{
              flex: 'none',
              background: 'none',
              border: '1px solid rgba(255,255,255,.22)',
              color: '#fff',
              fontFamily: 'var(--font-arcade)',
              fontWeight: 600,
              fontSize: 12,
              textTransform: 'uppercase',
              letterSpacing: '.04em',
              padding: '10px 14px',
              borderRadius: 2,
              cursor: 'pointer',
            }}
          >
            ↺ Replay
          </button>
        </div>
      </div>

      {/* scoreboard readout */}
      <div
        style={{
          background: '#181b24',
          border: '2px solid var(--ink)',
          boxShadow: '5px 5px 0 0 var(--yellow)',
          padding: 24,
        }}
      >
        <div className="lbl" style={{ fontSize: 11, color: 'rgba(255,255,255,.55)', marginBottom: 4 }}>
          Cleared by
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 18 }}>
          <div className="dk" style={{ fontSize: 'clamp(64px,11vw,104px)', color: '#FFD60A', lineHeight: 0.8 }}>
            {clearance}
          </div>
          <div className="dk" style={{ fontSize: 22, color: '#fff', paddingBottom: 10 }}>
            CM
          </div>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,.1)' }}>
          {TAPE.map((row) => (
            <div
              key={row.l}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                padding: '11px 0',
                borderBottom: '1px solid rgba(255,255,255,.07)',
              }}
            >
              <span className="lbl" style={{ fontSize: 11, color: 'rgba(255,255,255,.55)' }}>
                {row.l}
              </span>
              <span className="dk" style={{ fontSize: 22, color: '#fff' }}>
                {row.v}
              </span>
            </div>
          ))}
        </div>
        <p style={{ margin: '18px 0 0', fontSize: 13, lineHeight: 1.55, color: 'rgba(255,255,255,.6)' }}>
          One continuous motion, no correction, both bumpers untouched. We measured it three times because
          nobody believed the first two.
        </p>
        <a
          href="/hall-of-fame"
          style={{
            display: 'inline-block',
            marginTop: 18,
            color: '#FFD60A',
            fontFamily: 'var(--font-arcade)',
            fontWeight: 600,
            fontSize: 13,
            textTransform: 'uppercase',
            letterSpacing: '.05em',
            textDecoration: 'none',
          }}
        >
          Read the legend →
        </a>
      </div>
    </div>
  );
}
