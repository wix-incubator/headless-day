import { useState } from "react";

export default function ReviewForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [review, setReview] = useState("");
  const [productName, setProductName] = useState("");
  const [photo, setPhoto] = useState<{ url: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [msg, setMsg] = useState("");

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    setMsg("");
    const fd = new FormData();
    fd.append("file", f);
    try {
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      const d = await r.json();
      if (d.url) setPhoto({ url: d.url, name: f.name });
      else setMsg(d.error || "Photo upload failed. Try another image?");
    } catch {
      setMsg("Photo upload failed. Try another image?");
    } finally {
      setUploading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) { setMsg("Please pick a star rating."); return; }
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch("/api/review/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, rating, review, photoUrl: photo?.url || "", productName }),
      });
      const d = await r.json();
      if (d.ok) setDone(true);
      else setMsg(d.error || "Something went wrong. Try again?");
    } catch {
      setMsg("Something went wrong. Try again?");
    } finally {
      setBusy(false);
    }
  }

  if (done) return (
    <div className="rf-done card">
      <p className="rf-thanks">Thank you! 🌸</p>
      <p>Your review has been received and will appear here once confirmed.</p>
      <style>{css}</style>
    </div>
  );

  return (
    <form className="rf card" onSubmit={submit} noValidate>
      <h2 className="rf-h">Leave a review</h2>

      <div className="rf-stars">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className={"star" + (n <= (hover || rating) ? " on" : "")}
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
          >★</button>
        ))}
      </div>

      <div className="rf-row">
        <label className="rf-label">
          Your name
          <input className="rf-input" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Anna" />
        </label>
        <label className="rf-label">
          Email <span className="rf-muted">(not shown publicly)</span>
          <input className="rf-input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </label>
      </div>

      <label className="rf-label">
        Which piece did you order? <span className="rf-muted">(optional)</span>
        <input className="rf-input" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Portrait vase, small" />
      </label>

      <label className="rf-label">
        Your review
        <textarea className="rf-textarea" required rows={4} value={review} onChange={(e) => setReview(e.target.value)} placeholder="Tell us about your experience…" />
      </label>

      <label className="rf-label">
        Photo of your vase <span className="rf-muted">(optional)</span>
        <label className="rf-drop">
          <input type="file" accept="image/*" onChange={onFile} hidden />
          {uploading ? "Uploading…" : photo ? `📎 ${photo.name} — tap to change` : "📷 Add a photo"}
        </label>
        {photo && <img className="rf-preview" src={photo.url} alt="Your vase" />}
      </label>

      {msg && <p className="rf-err">{msg}</p>}

      <button className="btn tomato" type="submit" disabled={busy || uploading}>
        {busy ? "Sending…" : "Submit review"}
      </button>

      <style>{css}</style>
    </form>
  );
}

const css = `
  .rf { padding: 1.6rem; display: grid; gap: 1.1rem; }
  .rf-done { padding: 2rem; text-align: center; display: grid; gap: 0.5rem; justify-items: center; }
  .rf-thanks { font-family: "Fredoka", sans-serif; font-size: 1.6rem; margin: 0; }
  .rf-h { font-family: "Fredoka", sans-serif; font-size: 1.5rem; margin: 0; }
  .rf-stars { display: flex; gap: 0.25rem; }
  .star { font-size: 2rem; background: none; border: none; cursor: pointer; color: #d8cfc4; line-height: 1; padding: 0; transition: color 0.1s, transform 0.08s; }
  .star:hover, .star.on { color: var(--mustard); }
  .star:hover { transform: scale(1.15); }
  .rf-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem; }
  @media (max-width: 540px) { .rf-row { grid-template-columns: 1fr; } }
  .rf-label { display: grid; gap: 0.3rem; font-weight: 700; font-size: 0.95rem; }
  .rf-muted { font-weight: 400; color: var(--ink-soft); font-size: 0.85rem; }
  .rf-input, .rf-textarea { font-family: inherit; font-size: 1rem; border: 2.5px solid var(--ink); border-radius: 14px; padding: 0.6rem 0.9rem; background: #fff; width: 100%; }
  .rf-textarea { resize: vertical; }
  .rf-drop { display: block; cursor: pointer; border: 2.5px dashed var(--ink); border-radius: 14px; padding: 0.8rem; text-align: center; font-weight: 700; background: #fff; }
  .rf-drop:hover { background: var(--blush-soft); }
  .rf-preview { margin-top: 0.5rem; max-height: 180px; width: auto; border: 2.5px solid var(--ink); border-radius: 14px; box-shadow: 4px 4px 0 var(--ink); }
  .rf-err { color: var(--tomato); font-weight: 700; margin: 0; }
`;
