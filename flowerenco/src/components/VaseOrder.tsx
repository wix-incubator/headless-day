import { useEffect, useState } from "react";

type Size = { name: string; price?: string };

type StyleImage = { style: string; url: string };

const STYLE_BLURBS: Record<string, string> = {
  "Matte Folk": "Soft chalky glaze, rosy cheeks, simple painted stripes & dots.",
  "Glossy Doodle": "Shiny glaze covered in playful doodles — stars, hearts, bright colour.",
  "Blue Willow": "Glossy cobalt-&-white folk florals over pale clay, delft-inspired.",
};
const STYLE_ORDER = ["Matte Folk", "Glossy Doodle", "Blue Willow"];
const SIZE_ORDER = ["Small", "Medium", "Large"];

export default function VaseOrder({
  slug,
  productId,
  productName,
  sizes,
  currency = "USD",
  styleImages = [],
}: {
  slug?: string;
  productId: string;
  productName: string;
  sizes: Size[];
  currency?: string;
  styleImages?: StyleImage[];
}) {
  // Prefer the subject-matched images passed in; fall back to name order.
  const styles = (styleImages.length ? styleImages.map((s) => s.style) : STYLE_ORDER).map((name) => ({
    name,
    blurb: STYLE_BLURBS[name] || "",
    img: styleImages.find((s) => s.style === name)?.url || "",
  }));

  const sortedSizes = [...sizes].sort(
    (a, b) => SIZE_ORDER.indexOf(a.name) - SIZE_ORDER.indexOf(b.name)
  );
  const [size, setSize] = useState(sortedSizes[0]?.name || "");
  const [style, setStyle] = useState(styles[0]?.name || "");

  function pickStyle(name: string) {
    setStyle(name);
    window.dispatchEvent(new CustomEvent("flowerenco:style", { detail: { style: name } }));
  }

  // Pre-fill from a "Change product" click on the basket (size / style / notes / photo).
  useEffect(() => {
    if (!slug) return;
    const key = `flowerenco:prefill:${slug}`;
    let raw: string | null = null;
    try {
      raw = sessionStorage.getItem(key);
      if (raw) sessionStorage.removeItem(key);
    } catch {}
    if (!raw) return;
    try {
      const p = JSON.parse(raw);
      if (p.size && sortedSizes.some((s) => s.name === p.size)) setSize(p.size);
      if (p.style && styles.some((s) => s.name === p.style)) {
        setStyle(p.style);
        window.dispatchEvent(new CustomEvent("flowerenco:style", { detail: { style: p.style } }));
      }
      if (p.notes) setNotes(p.notes);
      if (p.photo) setPhoto({ url: p.photo, name: "your photo" });
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [photo, setPhoto] = useState<{ url: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [added, setAdded] = useState(false);

  const money = (a?: string) => {
    const n = Number(a);
    return Number.isNaN(n) ? "" : new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);
  };
  const current = sortedSizes.find((s) => s.name === size);

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
      else setMsg(d.error || "Hmm, the photo didn't upload. Try another one?");
    } catch {
      setMsg("Hmm, the photo didn't upload. Try another one?");
    } finally {
      setUploading(false);
    }
  }

  async function addToCart() {
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch("/api/cart/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, productName, size, style, notes, photoUrl: photo?.url, quantity: 1 }),
      });
      const d = await r.json();
      if (d.ok) {
        setAdded(true);
        window.dispatchEvent(new Event("cart:updated"));
      } else setMsg(d.error || "Could not add to cart.");
    } catch {
      setMsg("Could not add to cart.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="order">
      <div className="step">
        <p className="step-h"><span className="num">1</span> Pick a size</p>
        <div className="sizes">
          {sortedSizes.map((s) => (
            <button
              key={s.name}
              type="button"
              className={"size" + (size === s.name ? " on" : "")}
              onClick={() => setSize(s.name)}
            >
              <span className="size-name">{s.name}</span>
              {s.price && <span className="size-price">{money(s.price)}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="step">
        <p className="step-h"><span className="num">2</span> Pick a style</p>
        <div className="styles">
          {styles.map((s) => (
            <button
              key={s.name}
              type="button"
              className={"style-card" + (style === s.name ? " on" : "")}
              onClick={() => pickStyle(s.name)}
            >
              {s.img ? (
                <img className="style-chip" src={s.img} alt={s.name} loading="lazy" />
              ) : (
                <span className="style-chip ph" />
              )}
              <span className="style-name">{s.name}</span>
              <span className="style-blurb">{s.blurb}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="step">
        <p className="step-h"><span className="num">3</span> Upload a photo of your person or pet</p>
        <p className="hint">One clear photo works best — of a person, a pet, or the two of them together.</p>
        <label className="drop">
          <input type="file" accept="image/*" onChange={onFile} hidden />
          {uploading ? "Uploading…" : photo ? `📎 ${photo.name} — tap to change` : "📷 Choose a photo"}
        </label>
        {photo && <img className="preview" src={photo.url} alt="Your reference" />}
      </div>

      <div className="step">
        <p className="step-h"><span className="num">4</span> Add your notes</p>
        <textarea
          className="notes"
          rows={4}
          placeholder="Tell me about them — colours you love, their personality, freckles, that one crooked ear…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className="step">
        <p className="step-h"><span className="num">5</span> Add to basket</p>
        {added ? (
          <div className="done">
            <p>🎉 Added to your basket!</p>
            <div className="done-actions">
              <a className="btn tomato" href="/cart">Go to basket</a>
              <a className="btn ghost" href="/shop">Keep browsing</a>
            </div>
          </div>
        ) : (
          <>
            <button className="btn tomato big" type="button" onClick={addToCart} disabled={busy || !size}>
              {busy ? "Adding…" : `Add to basket · ${money(current?.price)}`}
            </button>
            {!photo && <p className="hint soft">You can add a photo now or send it to me later after ordering.</p>}
          </>
        )}
        {msg && <p className="err">{msg}</p>}
      </div>

      <style>{`
        .order { display: grid; gap: 1.4rem; }
        .step-h { font-family: "Fredoka", sans-serif; font-size: 1.15rem; margin: 0 0 0.6rem; display: flex; align-items: center; gap: 0.55rem; }
        .num { background: var(--cobalt); color: #fff; border: 2px solid var(--ink); width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.95rem; }
        .sizes { display: flex; gap: 0.6rem; flex-wrap: wrap; }
        .size { cursor: pointer; background: var(--paper); border: 2.5px solid var(--ink); border-radius: 16px; padding: 0.6rem 1rem; display: grid; gap: 0.1rem; min-width: 96px; text-align: center; font-family: inherit; box-shadow: 3px 3px 0 var(--ink); transition: transform .08s; }
        .size:hover { transform: translate(-1px,-1px); }
        .size.on { background: var(--mustard); }
        .size-name { font-weight: 800; }
        .size-price { font-size: 0.85rem; color: var(--ink-soft); }
        .size.on .size-price { color: var(--ink); }
        .styles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.6rem; }
        .style-card { cursor: pointer; text-align: left; background: var(--paper); border: 2.5px solid var(--ink); border-radius: 16px; padding: 0.7rem; display: grid; gap: 0.3rem; font-family: inherit; box-shadow: 3px 3px 0 var(--ink); transition: transform .08s; }
        .style-card:hover { transform: translate(-1px,-1px); }
        .style-card.on { background: var(--blush-soft); }
        .style-chip { display: block; width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 10px; border: 2px solid var(--ink); }
        .style-chip.ph { background: linear-gradient(135deg, var(--blush-soft), #cfe6e2); }
        .style-name { font-weight: 800; }
        .style-blurb { font-size: 0.82rem; color: var(--ink-soft); line-height: 1.35; }
        @media (max-width: 560px) { .styles { grid-template-columns: 1fr; } }
        .hint { color: var(--ink-soft); margin: 0 0 0.6rem; font-size: 0.95rem; }
        .hint.soft { margin-top: 0.7rem; }
        .drop { display: block; cursor: pointer; border: 2.5px dashed var(--ink); border-radius: 16px; padding: 1rem; text-align: center; font-weight: 700; background: #fff; }
        .drop:hover { background: var(--blush-soft); }
        .preview { margin-top: 0.8rem; max-height: 220px; width: auto; border: 2.5px solid var(--ink); border-radius: 16px; box-shadow: 4px 4px 0 var(--ink); }
        .notes { width: 100%; font-family: inherit; font-size: 1rem; border: 2.5px solid var(--ink); border-radius: 16px; padding: 0.8rem; resize: vertical; background: #fff; }
        .big { font-size: 1.15rem; }
        .done p { font-family: "Fredoka", sans-serif; font-size: 1.2rem; margin: 0 0 0.7rem; }
        .done-actions { display: flex; gap: 0.6rem; flex-wrap: wrap; }
        .err { color: var(--tomato); font-weight: 700; margin-top: 0.6rem; }
      `}</style>
    </div>
  );
}
