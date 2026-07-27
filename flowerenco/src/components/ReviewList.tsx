import { useEffect, useState } from "react";

type Review = {
  id: string;
  name: string;
  rating: number;
  review: string;
  photoUrl: string;
  productName: string;
  date: string;
};

function Stars({ n }: { n: number }) {
  return (
    <span className="rl-stars" aria-label={`${n} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={"rl-star" + (i <= n ? " on" : "")}>★</span>
      ))}
    </span>
  );
}

export default function ReviewList() {
  const [reviews, setReviews] = useState<Review[] | null>(null);

  useEffect(() => {
    fetch("/api/review/list")
      .then((r) => r.json())
      .then((d) => setReviews(d.reviews || []))
      .catch(() => setReviews([]));
  }, []);

  if (reviews === null) return <p className="rl-muted">Loading reviews…<style>{css}</style></p>;

  if (reviews.length === 0) return (
    <div className="rl-empty">
      <p>No reviews yet — be the first! 🌸</p>
      <style>{css}</style>
    </div>
  );

  return (
    <div className="rl">
      <div className="rl-grid">
        {reviews.map((r) => (
          <div className="rl-card card" key={r.id}>
            {r.photoUrl && (
              <img className="rl-photo" src={r.photoUrl} alt={`${r.name}'s vase`} loading="lazy" />
            )}
            <div className="rl-body">
              <Stars n={r.rating} />
              <p className="rl-text">"{r.review}"</p>
              <p className="rl-meta">
                <strong>{r.name}</strong>
                {r.productName && <span> · {r.productName}</span>}
              </p>
            </div>
          </div>
        ))}
      </div>
      <style>{css}</style>
    </div>
  );
}

const css = `
  .rl-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.1rem; }
  .rl-card { display: grid; overflow: hidden; }
  .rl-photo { width: 100%; aspect-ratio: 1; object-fit: cover; border-bottom: 2.5px solid var(--ink); }
  .rl-body { padding: 1.1rem; display: grid; gap: 0.5rem; }
  .rl-stars { display: flex; gap: 0.1rem; }
  .rl-star { font-size: 1.15rem; color: #d8cfc4; }
  .rl-star.on { color: var(--mustard); }
  .rl-text { margin: 0; font-style: italic; color: var(--ink-soft); line-height: 1.55; font-size: 0.97rem; }
  .rl-meta { margin: 0; font-size: 0.88rem; color: var(--ink-soft); }
  .rl-meta strong { color: var(--ink); }
  .rl-empty, .rl-muted { color: var(--ink-soft); font-style: italic; }
`;
