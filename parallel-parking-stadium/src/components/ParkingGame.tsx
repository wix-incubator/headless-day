import { useEffect, useRef, useState } from 'react';
import type { MutableRefObject, PointerEvent as ReactPointerEvent, CSSProperties } from 'react';
import { carCells, GRID_W, GRID_H, CARS, type CarColors } from '../lib/carSprite';

/* ============================================================
   THE SLOT — a playable parallel-parking mini-game.
   Reverse the pixel car into the gap. Scored like the real sport:
   the smallest CLEAN clearance wins, touches are penalties, the clock
   breaks ties. A perfect-centre park clears by 11cm — the legend's number.
   ============================================================ */

const W = 360;
const H = 230;

// world geometry (logical px) — small pixel cars
const CAR_L = 40;
const CAR_W = 24;
const HALF_L = CAR_L / 2;
const HALF_W = CAR_W / 2;
const PARK_Y = 150; // y-centre of the parked row
const A = { x: 100, y: PARK_Y, hl: HALF_L, hw: HALF_W, a: 0 }; // left slot neighbour (right edge = 120)
const B = { x: 216, y: PARK_Y, hl: HALF_L, hw: HALF_W, a: 0 }; // right slot neighbour (left edge = 196)
const C = { x: 40, y: PARK_Y, hl: HALF_L, hw: HALF_W, a: 0 }; // packed in beyond A
const D = { x: 276, y: PARK_Y, hl: HALF_L, hw: HALF_W, a: 0 }; // packed in beyond B
const SLOT_L = 120;
const SLOT_R = 196;
const BOUND = { l: 14, r: 346, t: 16, b: 198 };

// pre-render a car sprite to an offscreen canvas (native pixel grid → crisp
// nearest-neighbour scaling/rotation when drawn).
function makeSprite(c: CarColors): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = GRID_W;
  cv.height = GRID_H;
  const x = cv.getContext('2d')!;
  for (const p of carCells(c)) {
    x.fillStyle = p.color;
    x.fillRect(p.x, p.y, 1, 1);
  }
  return cv;
}

type Box = { x: number; y: number; hl: number; hw: number; a: number };
type Score = { i: string; cm: number; t: number };

const SEED: Score[] = [
  { i: 'LUC', cm: 6, t: 1 },
  { i: 'TOM', cm: 7, t: 0 },
  { i: 'PAU', cm: 8, t: 2 },
  { i: 'NES', cm: 9, t: 3 },
  { i: 'CAM', cm: 10, t: 1 },
];

function corners(b: Box) {
  const c = Math.cos(b.a);
  const s = Math.sin(b.a);
  const dx = [b.hl, b.hl, -b.hl, -b.hl];
  const dy = [b.hw, -b.hw, -b.hw, b.hw];
  return dx.map((_, i) => ({
    x: b.x + dx[i] * c - dy[i] * s,
    y: b.y + dx[i] * s + dy[i] * c,
  }));
}

// SAT overlap test between two oriented boxes
function overlap(a: Box, b: Box) {
  const ca = corners(a);
  const cb = corners(b);
  const axes = [
    { x: Math.cos(a.a), y: Math.sin(a.a) },
    { x: -Math.sin(a.a), y: Math.cos(a.a) },
    { x: Math.cos(b.a), y: Math.sin(b.a) },
    { x: -Math.sin(b.a), y: Math.cos(b.a) },
  ];
  for (const ax of axes) {
    let amin = Infinity,
      amax = -Infinity,
      bmin = Infinity,
      bmax = -Infinity;
    for (const p of ca) {
      const d = p.x * ax.x + p.y * ax.y;
      amin = Math.min(amin, d);
      amax = Math.max(amax, d);
    }
    for (const p of cb) {
      const d = p.x * ax.x + p.y * ax.y;
      bmin = Math.min(bmin, d);
      bmax = Math.max(bmax, d);
    }
    if (amax < bmin || bmax < amin) return false;
  }
  return true;
}

function loadScores(): Score[] {
  if (typeof localStorage === 'undefined') return SEED;
  try {
    const raw = localStorage.getItem('pps_scores');
    if (!raw) return SEED;
    return JSON.parse(raw);
  } catch {
    return SEED;
  }
}

function rankScores(s: Score[]) {
  return [...s].sort((a, b) => a.cm - b.cm || a.t - b.t).slice(0, 8);
}

export default function ParkingGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<'ready' | 'playing' | 'parked'>('ready');
  const [hud, setHud] = useState({ time: 0, touches: 0, clearance: 0, canPark: false });
  const [scores, setScores] = useState<Score[]>(SEED);
  const [result, setResult] = useState<{ cm: number; t: number; time: number } | null>(null);
  const [initials, setInitials] = useState('');
  const [saved, setSaved] = useState(false);

  const car = useRef<Box & { vx: number; vy: number }>({ x: 250, y: 96, hl: HALF_L, hw: HALF_W, a: 0, vx: 0, vy: 0 });
  const input = useRef({ up: false, down: false, left: false, right: false });
  const raf = useRef<number | null>(null);
  const last = useRef<number | null>(null);
  const touchCount = useRef(0);
  const touchCd = useRef(0);
  const startT = useRef(0);
  const holdWin = useRef(0);
  const canPark = useRef(false);
  const running = useRef(false);
  const sprites = useRef<Record<'player' | 'a' | 'b' | 'c' | 'd', HTMLCanvasElement> | null>(null);
  const reduced = useRef(false);

  useEffect(() => {
    sprites.current = {
      player: makeSprite(CARS.red),
      a: makeSprite(CARS.slate),
      b: makeSprite(CARS.amber),
      c: makeSprite(CARS.teal),
      d: makeSprite(CARS.blue),
    };
    setScores(rankScores(loadScores()));
    reduced.current =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion:reduce)').matches;
    draw();
    return () => {
      running.current = false;
      if (raf.current) cancelAnimationFrame(raf.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keyboard
  useEffect(() => {
    const map: Record<string, keyof typeof input.current> = {
      ArrowUp: 'up',
      ArrowDown: 'down',
      ArrowLeft: 'left',
      ArrowRight: 'right',
      w: 'up',
      s: 'down',
      a: 'left',
      d: 'right',
    };
    const down = (e: KeyboardEvent) => {
      const k = map[e.key];
      if (!k) return;
      if (status === 'playing') e.preventDefault();
      input.current[k] = true;
    };
    const up = (e: KeyboardEvent) => {
      const k = map[e.key];
      if (k) input.current[k] = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [status]);

  function reset() {
    car.current = { x: 250, y: 96, hl: HALF_L, hw: HALF_W, a: 0, vx: 0, vy: 0 };
    touchCount.current = 0;
    touchCd.current = 0;
    holdWin.current = 0;
    startT.current = performance.now();
    canPark.current = false;
    setHud({ time: 0, touches: 0, clearance: 0, canPark: false });
    setResult(null);
    setInitials('');
    setSaved(false);
  }

  function start() {
    reset();
    setStatus('playing');
    last.current = null;
    running.current = true;
    raf.current = requestAnimationFrame(loop);
  }

  function gaps() {
    const c = car.current;
    const ext = Math.abs(Math.cos(c.a)) * HALF_L + Math.abs(Math.sin(c.a)) * HALF_W;
    const left = c.x - ext;
    const right = c.x + ext;
    return { rear: left - 120, front: 196 - right }; // A right edge 120, B left edge 196
  }

  function step(dtf: number) {
    const c = car.current;
    const i = input.current;
    const accel = 0.16;
    const maxV = 2.4;

    // SCREEN-RELATIVE controls: the arrows push the car the way you press
    // (↑ up, ↓ down, ← left, → right). No gas/steer mind-bending.
    const ax = (i.right ? 1 : 0) - (i.left ? 1 : 0);
    const ay = (i.down ? 1 : 0) - (i.up ? 1 : 0);
    c.vx += ax * accel * dtf;
    c.vy += ay * accel * dtf;
    if (!ax) c.vx *= Math.pow(0.84, dtf);
    if (!ay) c.vy *= Math.pow(0.84, dtf);
    const sp = Math.hypot(c.vx, c.vy);
    if (sp > maxV) {
      c.vx = (c.vx / sp) * maxV;
      c.vy = (c.vy / sp) * maxV;
    }
    if (Math.abs(c.vx) < 0.02 && !ax) c.vx = 0;
    if (Math.abs(c.vy) < 0.02 && !ay) c.vy = 0;
    // the car turns to face the way it's moving
    if (sp > 0.18) c.a = Math.atan2(c.vy, c.vx);

    const px = c.x;
    const py = c.y;
    const pa = c.a;
    c.x += c.vx * 1.7 * dtf;
    c.y += c.vy * 1.7 * dtf;

    // collision with the parked cars or the deck edges → soft bounce + a touch
    const cor = corners(c);
    const outOfBounds = cor.some(
      (p) => p.x < BOUND.l || p.x > BOUND.r || p.y < BOUND.t || p.y > BOUND.b,
    );
    if (overlap(c, A) || overlap(c, B) || overlap(c, C) || overlap(c, D) || outOfBounds) {
      c.x = px;
      c.y = py;
      c.a = pa;
      c.vx = -c.vx * 0.3;
      c.vy = -c.vy * 0.3;
      if (touchCd.current <= 0) {
        touchCount.current += 1;
        touchCd.current = 25;
      }
    }
    if (touchCd.current > 0) touchCd.current -= dtf;

    // win: lined up flat in the slot and stopped
    const angOff = Math.abs(Math.atan2(Math.sin(c.a), Math.cos(c.a)));
    const aligned = Math.min(angOff, Math.abs(Math.PI - angOff)) < 0.3; // ~17°, near horizontal
    const inX = c.x > SLOT_L - 4 && c.x < SLOT_R + 4;
    const inY = c.y > PARK_Y - 13 && c.y < PARK_Y + 13;
    const stopped = Math.hypot(c.vx, c.vy) < 0.12;
    canPark.current = aligned && inX && inY; // positioned in the slot → "stop to park"
    if (canPark.current && stopped) {
      holdWin.current += dtf;
      if (holdWin.current > 12) return win();
    } else {
      holdWin.current = 0;
    }
  }

  function win() {
    running.current = false;
    if (raf.current) cancelAnimationFrame(raf.current);
    const g = gaps();
    const cm = Math.max(0, Math.round(Math.min(g.front, g.rear)));
    const t = touchCount.current;
    const time = (performance.now() - startT.current) / 1000;
    setResult({ cm, t, time });
    setHud({ time, touches: t, clearance: cm, canPark: false });
    setStatus('parked');
    draw();
  }

  function loop(ts: number) {
    if (last.current == null) last.current = ts;
    const dtf = Math.min(2.5, (ts - last.current) / 16.67);
    last.current = ts;
    step(dtf);
    draw();
    const g = gaps();
    setHud({
      time: (performance.now() - startT.current) / 1000,
      touches: touchCount.current,
      clearance: Math.max(0, Math.round(Math.min(g.front, g.rear))),
      canPark: canPark.current,
    });
    if (running.current) {
      raf.current = requestAnimationFrame(loop);
    }
  }

  function saveScore() {
    if (!result) return;
    const i = (initials || 'YOU').toUpperCase().slice(0, 3).padEnd(3, '·');
    const next = rankScores([...loadScores(), { i, cm: result.cm, t: result.t }]);
    try {
      localStorage.setItem('pps_scores', JSON.stringify(next));
    } catch {}
    setScores(next);
    setSaved(true);
  }

  // ---- rendering ----
  // a pretty top-down car (forward = +x)
  function carSprite(ctx: CanvasRenderingContext2D, b: Box, sprite: HTMLCanvasElement) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.a);
    // contact shadow
    ctx.fillStyle = 'rgba(0,0,0,.12)';
    ctx.fillRect(-HALF_L + 1, -HALF_W + 2, CAR_L, CAR_W);
    // pixel sprite, nearest-neighbour scaled (front of sprite is +x)
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sprite, -HALF_L, -HALF_W, CAR_L, CAR_W);
    ctx.restore();
  }

  function draw() {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = true;

    // deck concrete
    ctx.fillStyle = '#cfd2cb';
    ctx.fillRect(0, 0, W, H);
    // faint expansion-joint grid
    ctx.strokeStyle = 'rgba(0,0,0,.06)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, H);
      ctx.stroke();
    }
    // curb / sidewalk
    ctx.fillStyle = '#dde0d8';
    ctx.fillRect(0, 180, W, H - 180);
    ctx.strokeStyle = 'rgba(20,20,20,.25)';
    ctx.beginPath();
    ctx.moveTo(0, 180.5);
    ctx.lineTo(W, 180.5);
    ctx.stroke();

    // the painted slot box — turns green when you're lined up (just stop!)
    const lit = canPark.current;
    if (lit) {
      ctx.fillStyle = 'rgba(31,157,77,.25)';
      ctx.fillRect(SLOT_L, PARK_Y - HALF_W - 4, SLOT_R - SLOT_L, CAR_W + 8);
    }
    ctx.strokeStyle = lit ? '#1f9d4d' : '#f2b400';
    ctx.setLineDash([6, 4]);
    ctx.lineWidth = 2.5;
    ctx.strokeRect(SLOT_L, PARK_Y - HALF_W - 4, SLOT_R - SLOT_L, CAR_W + 8);
    ctx.setLineDash([]);
    // traffic cones at slot corners
    const cone = (x: number, y: number) => {
      ctx.fillStyle = '#ff7a1a';
      ctx.beginPath();
      ctx.moveTo(x, y - 5); ctx.lineTo(x + 4, y + 4); ctx.lineTo(x - 4, y + 4);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      ctx.fillRect(x - 2.5, y, 5, 1.5);
    };
    [SLOT_L, SLOT_R].forEach((x) => {
      cone(x, PARK_Y - HALF_W - 7);
      cone(x, PARK_Y + HALF_W + 7);
    });

    // parked cars
    const sp = sprites.current;
    if (sp) {
      carSprite(ctx, C, sp.c);
      carSprite(ctx, A, sp.a);
      carSprite(ctx, B, sp.b);
      carSprite(ctx, D, sp.d);
      carSprite(ctx, car.current, sp.player); // race red, the player
    }
  }


  return (
    <div className="game-wrap">
      <style
        dangerouslySetInnerHTML={{
          __html: `.game-wrap{display:grid;grid-template-columns:1fr;gap:16px}
@media(min-width:820px){.game-wrap{grid-template-columns:1.6fr 1fr}}
.game-screen{position:relative;background:#0d0818;border:3px solid var(--grid);box-shadow:6px 6px 0 0 rgba(0,0,0,.55)}
.game-canvas{display:block;width:100%;height:auto;image-rendering:pixelated}
.game-hud{position:absolute;top:0;left:0;right:0;display:flex;justify-content:space-between;padding:8px 10px;font-family:var(--font-arcade);font-size:10px;color:var(--ink);text-shadow:1px 1px 0 rgba(255,255,255,.7);pointer-events:none}
.game-over{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;background:rgba(255,255,255,.9);text-align:center;padding:18px}
.dpad{display:grid;grid-template-columns:repeat(3,52px);grid-template-rows:repeat(2,52px);gap:6px;justify-content:center;margin-top:12px}
.dbtn{font-family:var(--font-arcade);font-size:16px;background:var(--panel-2);color:var(--ink);border:2px solid var(--grid);box-shadow:3px 3px 0 0 #000;cursor:pointer;user-select:none;touch-action:none}
.dbtn:active{transform:translate(2px,2px);box-shadow:1px 1px 0 0 #000}`,
        }}
      />

      <div>
        <div className="game-screen">
          <canvas ref={canvasRef} width={W} height={H} className="game-canvas" />

          {status === 'playing' && (
            <div className="game-hud">
              <span>TIME {hud.time.toFixed(1)}</span>
              <span style={{ color: hud.canPark ? 'var(--green)' : 'var(--ink)' }}>
                {hud.canPark ? '▸ STOP TO PARK' : hud.clearance > 0 ? `${hud.clearance} CM` : 'FIND THE GAP'}
              </span>
              <span style={{ color: hud.touches > 0 ? 'var(--magenta)' : 'var(--ink)' }}>
                TOUCH {hud.touches}
              </span>
            </div>
          )}

          {status === 'ready' && (
            <div className="game-over">
              <div className="arcade" style={{ fontSize: 16, color: 'var(--gold)' }}>
                THE SLOT
              </div>
              <p style={{ margin: 0, color: 'var(--ink-dim)', fontSize: 18, maxWidth: 340 }}>
                Drive into the gap between the cars, straighten up, and stop. The box turns
                <b style={{ color: 'var(--green)' }}> green</b> when you're lined up — then just stop.
              </p>
              <div className="arcade" style={{ fontSize: 11, color: 'var(--ink)' }}>
                ↑ ↓ ← → move · the smallest clean gap wins
              </div>
              <button className="btn btn-cyan" onClick={start}>
                ▶ Press start
              </button>
              <div className="lbl" style={{ fontSize: 10, color: 'var(--ink-dim)' }}>
                Arrow keys / WASD · or tap the pad
              </div>
            </div>
          )}

          {status === 'parked' && result && (
            <div className="game-over">
              <div className="arcade" style={{ fontSize: 14, color: 'var(--cyan)' }}>PARKED!</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
                <span className="dk" style={{ fontSize: 56, color: 'var(--gold)', lineHeight: 0.8 }}>
                  {result.cm}
                </span>
                <span className="dk" style={{ fontSize: 18, paddingBottom: 8 }}>CM</span>
              </div>
              <div className="lbl" style={{ fontSize: 11, color: 'var(--ink-dim)' }}>
                {result.t} touch{result.t === 1 ? '' : 'es'} · {result.time.toFixed(1)}s
              </div>
              {!saved ? (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <input
                    value={initials}
                    onChange={(e) => setInitials(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3))}
                    placeholder="AAA"
                    aria-label="Your initials"
                    maxLength={3}
                    style={{
                      width: 80,
                      textAlign: 'center',
                      fontFamily: 'var(--font-arcade)',
                      fontSize: 16,
                      letterSpacing: '0.2em',
                      background: 'var(--bg)',
                      color: 'var(--gold)',
                      border: '2px solid var(--grid)',
                      padding: '8px',
                    }}
                  />
                  <button className="btn" onClick={saveScore}>Enter</button>
                </div>
              ) : (
                <div className="lbl" style={{ fontSize: 11, color: 'var(--green)' }}>On the board ▸</div>
              )}
              <button className="btn-ghost btn" onClick={start}>↺ Again</button>
            </div>
          )}
        </div>

        {/* touch / click controls */}
        <Dpad input={input} />
      </div>

      {/* high-score board */}
      <div className="panel-y panel" style={{ padding: 18, alignSelf: 'start' }}>
        <div className="arcade" style={{ fontSize: 11, color: 'var(--gold)', marginBottom: 14 }}>
          Hi-Scores
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div className="lbl" style={{ display: 'grid', gridTemplateColumns: '28px 1fr 56px 44px', fontSize: 10, color: 'var(--ink-dim)', paddingBottom: 6 }}>
            <span>#</span><span>Who</span><span style={{ textAlign: 'right' }}>Clear</span><span style={{ textAlign: 'right' }}>Tch</span>
          </div>
          {scores.map((s, i) => (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '28px 1fr 56px 44px',
                alignItems: 'baseline',
                padding: '6px 0',
                borderTop: '1px solid var(--grid)',
                color: i === 0 ? 'var(--gold)' : 'var(--ink)',
              }}
            >
              <span className="arcade" style={{ fontSize: 10 }}>{String(i + 1).padStart(2, '0')}</span>
              <span className="arcade" style={{ fontSize: 11, letterSpacing: '0.12em' }}>{s.i}</span>
              <span className="dk" style={{ fontSize: 18, textAlign: 'right' }}>{s.cm}<span style={{ fontSize: 10 }}> CM</span></span>
              <span className="dk" style={{ fontSize: 16, textAlign: 'right', color: 'var(--ink-dim)' }}>{s.t}</span>
            </div>
          ))}
        </div>
        <p style={{ margin: '14px 0 0', fontSize: 16, lineHeight: 1.3, color: 'var(--ink-dim)' }}>
          Smaller clearance wins, clean. A perfect-centre park clears by 11 — the legend's number. Beat it.
        </p>
      </div>
    </div>
  );
}

// hold-to-drive control pad (pointer + touch)
function Dpad({ input }: { input: MutableRefObject<{ up: boolean; down: boolean; left: boolean; right: boolean }> }) {
  const set = (k: 'up' | 'down' | 'left' | 'right', v: boolean) => (e: ReactPointerEvent) => {
    e.preventDefault();
    input.current[k] = v;
  };
  const btn = (k: 'up' | 'down' | 'left' | 'right', label: string, style: CSSProperties) => (
    <button
      className="dbtn"
      style={style}
      onPointerDown={set(k, true)}
      onPointerUp={set(k, false)}
      onPointerLeave={set(k, false)}
      onPointerCancel={set(k, false)}
      aria-label={k}
    >
      {label}
    </button>
  );
  return (
    <div className="dpad" aria-hidden="false">
      <span />
      {btn('up', '▲', { gridColumn: 2, gridRow: 1 })}
      <span />
      {btn('left', '◀', { gridColumn: 1, gridRow: 2 })}
      {btn('down', '▼', { gridColumn: 2, gridRow: 2 })}
      {btn('right', '▶', { gridColumn: 3, gridRow: 2 })}
    </div>
  );
}
