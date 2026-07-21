import { useRef, useState } from 'react';

// Drag-to-reveal: a plain flowerless field (before) vs a blooming, flower-crowned
// meadow (after). Embodies the founding belief — the cows never got flowers, until us.
export default function BeforeAfter() {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(52);
  const [dragging, setDragging] = useState(false);

  const setFromClientX = (clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos(Math.max(2, Math.min(98, ((clientX - r.left) / r.width) * 100)));
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') { setPos((p) => Math.max(2, p - 4)); e.preventDefault(); }
    if (e.key === 'ArrowRight') { setPos((p) => Math.min(98, p + 4)); e.preventDefault(); }
  };

  return (
    <figure className="ba-wrap" style={{ margin: 0 }}>
      <div
        ref={ref}
        className={`ba${dragging ? ' is-dragging' : ''}`}
        style={{ ['--pos' as string]: `${pos}%` }}
        onPointerDown={(e) => { setDragging(true); (e.target as HTMLElement).setPointerCapture?.(e.pointerId); setFromClientX(e.clientX); }}
        onPointerMove={(e) => { if (dragging) setFromClientX(e.clientX); }}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
      >
        <img className="ba__img ba__after" src="/about/after.png" alt="A blooming wildflower meadow with flower-crowned cows — the world after ZER4MOO." draggable={false} />
        <img className="ba__img ba__before" src="/about/before.png" alt="A plain green field with cows and no flowers — before ZER4MOO." draggable={false} />
        <span className="ba__label ba__label--before">Before us</span>
        <span className="ba__label ba__label--after">After us</span>
        <div className="ba__divider">
          <button
            type="button" className="ba__handle" aria-label="Drag to reveal the flowers"
            role="slider" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pos)}
            onKeyDown={onKey}
            onPointerDown={(e) => { setDragging(true); (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); }}
          >
            <span aria-hidden="true">↔</span>
          </button>
        </div>
      </div>
      <figcaption className="ba-cap muted">Drag to give the field its flowers.</figcaption>
    </figure>
  );
}
