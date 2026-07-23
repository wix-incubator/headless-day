import { useEffect, useState } from "react";

type Slide = { style: string; url: string };

export default function ProductGallery({ images, alt }: { images: Slide[]; alt: string }) {
  const [i, setI] = useState(0);
  const n = images.length;

  useEffect(() => {
    // When the buyer picks a style in the order flow, jump the carousel to it.
    const onStyle = (e: Event) => {
      const style = (e as CustomEvent).detail?.style;
      const idx = images.findIndex((s) => s.style === style);
      if (idx >= 0) setI(idx);
    };
    window.addEventListener("flowerenco:style", onStyle as EventListener);
    return () => window.removeEventListener("flowerenco:style", onStyle as EventListener);
  }, [images]);

  if (n === 0) return null;
  const go = (d: number) => setI((p) => (p + d + n) % n);
  const cur = images[i];

  return (
    <div className="gal">
      <div className="frame">
        <img src={cur.url} alt={`${alt} — ${cur.style}`} />
        {n > 1 && (
          <>
            <button className="arrow left" onClick={() => go(-1)} aria-label="Previous">‹</button>
            <button className="arrow right" onClick={() => go(1)} aria-label="Next">›</button>
            <span className="caption">{cur.style}</span>
          </>
        )}
      </div>
      {n > 1 && (
        <div className="thumbs">
          {images.map((s, idx) => (
            <button
              key={s.style}
              className={"thumb" + (idx === i ? " on" : "")}
              onClick={() => setI(idx)}
              aria-label={s.style}
            >
              <img src={s.url} alt={s.style} loading="lazy" />
            </button>
          ))}
        </div>
      )}

      <style>{`
        .gal { display: grid; gap: 0.7rem; }
        .frame { position: relative; }
        .frame > img { width: 100%; aspect-ratio: 1; object-fit: cover; border: 2.5px solid var(--ink); border-radius: var(--radius); box-shadow: var(--shadow); }
        .arrow { position: absolute; top: 50%; transform: translateY(-50%); width: 46px; height: 46px; border-radius: 50%; border: 2.5px solid var(--ink); background: var(--paper); font-size: 1.7rem; line-height: 1; font-family: "Fredoka", sans-serif; cursor: pointer; box-shadow: 3px 3px 0 var(--ink); display: flex; align-items: center; justify-content: center; padding-bottom: 4px; }
        .arrow:hover { background: var(--mustard); }
        .arrow.left { left: 0.7rem; }
        .arrow.right { right: 0.7rem; }
        .caption { position: absolute; left: 0.9rem; bottom: 0.9rem; background: var(--ink); color: var(--paper); font-weight: 800; font-size: 0.85rem; padding: 0.25rem 0.7rem; border-radius: 999px; }
        .thumbs { display: grid; grid-template-columns: repeat(${n}, 1fr); gap: 0.5rem; }
        .thumb { padding: 0; cursor: pointer; border: 2.5px solid var(--ink); border-radius: 12px; overflow: hidden; background: var(--paper); box-shadow: 2px 2px 0 var(--ink); }
        .thumb.on { outline: 3px solid var(--tomato); outline-offset: 1px; }
        .thumb img { width: 100%; aspect-ratio: 1; object-fit: cover; display: block; }
      `}</style>
    </div>
  );
}
