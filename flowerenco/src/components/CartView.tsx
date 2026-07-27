import { useEffect, useState } from "react";

type LineItem = { id: string; productId?: string; name: string; quantity: number; price?: string; image?: string };

export default function CartView() {
  const [items, setItems] = useState<LineItem[] | null>(null);
  const [note, setNote] = useState("");
  const [subtotal, setSubtotal] = useState<string | undefined>();
  const [currency, setCurrency] = useState("USD");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingQtyId, setUpdatingQtyId] = useState<string | null>(null);

  function load() {
    return fetch("/api/cart/get")
      .then((r) => r.json())
      .then((d) => {
        setItems(d.lineItems || []);
        setNote(d.buyerNote || "");
        setSubtotal(d.subtotal);
        if (d.currency) setCurrency(d.currency);
      })
      .catch(() => setItems([]));
  }

  useEffect(() => {
    load();
  }, []);

  async function deleteItem(lineItemId: string) {
    setDeletingId(lineItemId);
    try {
      await fetch("/api/cart/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineItemId }),
      });
      window.dispatchEvent(new Event("cart:updated"));
      await load();
    } catch {
      setMsg("Could not delete that item — try again?");
    } finally {
      setDeletingId(null);
    }
  }

  async function updateQty(lineItemId: string, quantity: number) {
    setUpdatingQtyId(lineItemId);
    try {
      await fetch("/api/cart/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineItemId, quantity }),
      });
      window.dispatchEvent(new Event("cart:updated"));
      await load();
    } catch {
      setMsg("Could not update quantity — try again?");
    } finally {
      setUpdatingQtyId(null);
    }
  }

  const money = (a?: string) => {
    const n = Number(a);
    return Number.isNaN(n) ? "" : new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);
  };

  async function changeProduct(lineItemId: string, slug: string, cfg: any) {
    // Carry the buyer's choices back to the product page so it re-opens pre-filled.
    try {
      if (slug && cfg) {
        sessionStorage.setItem(
          `flowerenco:prefill:${slug}`,
          JSON.stringify({ size: cfg.size || "", style: cfg.style || "", notes: cfg.notes || "", photo: cfg.photo || "" })
        );
      }
    } catch {}
    // Remove the current item first so reconfiguring replaces it instead of adding a duplicate.
    try {
      await fetch("/api/cart/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineItemId }),
      });
    } catch {}
    window.dispatchEvent(new Event("cart:updated"));
    window.location.href = slug ? `/product/${slug}` : "/shop";
  }

  async function checkout() {
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch("/api/cart/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origin: window.location.origin }),
      });
      const d = await r.json();
      if (d.url) window.location.href = d.url;
      else setMsg(d.error || "Could not start checkout.");
    } catch {
      setMsg("Could not start checkout.");
    } finally {
      setBusy(false);
    }
  }

  // Turn the buyer note into structured per-item brief entries (name / size / style / notes / photo).
  const grab = (line: string, re: RegExp) => (line.match(re) || [])[1]?.trim() || "";
  const brief = note
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => ({
      name: grab(line, /^•\s*([^|]+?)\s*(?:\||$)/),
      size: grab(line, /Size:\s*([^|]+?)\s*(?:\||$)/i),
      style: grab(line, /Style:\s*([^|]+?)\s*(?:\||$)/i),
      notes: grab(line, /Notes:\s*(.*?)\s*(?:\|\s*Photo:|$)/i),
      photo: grab(line, /Photo:\s*(https?:\/\/\S+)/i),
    }));

  if (items === null) return <p className="muted">Loading your basket…</p>;

  if (items.length === 0)
    return (
      <div className="empty card">
        <p className="big">Your basket is empty 🌼</p>
        <p>Let's make something for someone you love.</p>
        <a className="btn tomato" href="/shop">Start a vase</a>
        <style>{emptyCss}</style>
      </div>
    );

  return (
    <div className="cart">
      <div className="items">
        {items.map((li, idx) => {
          const b = brief[idx] || { size: "", style: "", notes: "", photo: "", name: "" };
          const slug = (li.name || b.name || "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");
          const pic = b.photo || li.image || "";
          const isBusy = deletingId === li.id || updatingQtyId === li.id;
          return (
            <div className="item card" key={li.id}>
              {pic ? (
                <img className="item-pic" src={pic} alt={li.name} />
              ) : (
                <div className="item-pic none">no photo yet</div>
              )}
              <div className="item-body">
                <p className="item-name">{li.name}</p>
                {b.size && <p className="field"><span>Size</span>{b.size}</p>}
                {b.style && <p className="field"><span>Style</span>{b.style}</p>}
                {b.notes && <p className="field"><span>Notes</span>{b.notes}</p>}
                <div className="item-actions">
                  <button
                    type="button"
                    className="btn ghost change"
                    onClick={() => changeProduct(li.id, slug, b)}
                    disabled={isBusy}
                  >
                    Change product
                  </button>
                  <button
                    type="button"
                    className="btn delete"
                    onClick={() => deleteItem(li.id)}
                    disabled={isBusy}
                  >
                    {deletingId === li.id ? (
                      <><span className="spin" aria-hidden="true" /> Deleting…</>
                    ) : (
                      "Delete product"
                    )}
                  </button>
                </div>
              </div>
              <div className="item-price">
                <span className="price">{money(li.price)}</span>
                {li.quantity != null && (
                  <div className="qty-stepper">
                    <button
                      type="button"
                      className="qty-btn"
                      aria-label="Decrease quantity"
                      onClick={() => updateQty(li.id, li.quantity - 1)}
                      disabled={isBusy || li.quantity <= 1}
                    >−</button>
                    <span className="qty-count">
                      {updatingQtyId === li.id ? <span className="spin sm" aria-hidden="true" /> : li.quantity}
                    </span>
                    <button
                      type="button"
                      className="qty-btn"
                      aria-label="Increase quantity"
                      onClick={() => updateQty(li.id, li.quantity + 1)}
                      disabled={isBusy}
                    >+</button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="summary card">
        {subtotal && (
          <p className="sub">
            <span>Subtotal</span>
            <span>{money(subtotal)}</span>
          </p>
        )}
        <button className="btn tomato big" onClick={checkout} disabled={busy}>
          {busy ? "Taking you to checkout…" : "Pay by card"}
        </button>
        <div className="policy">
          <p className="policy-h">Good to know</p>
          <p>🚚 <strong>Shipping is paid when you collect your piece</strong> — not at checkout.</p>
          <p>↩️ If you reject the finished vase, a <strong>70% refund</strong> is issued (the remaining 30% covers the made-to-order materials & my studio time).</p>
          <p className="muted small">Each piece is hand-made to order, just for you.</p>
        </div>
        {msg && <p className="err">{msg}</p>}
      </div>

      <style>{`
        .cart { display: grid; gap: 1.2rem; }
        .items { display: grid; gap: 1rem; }
        .item { display: flex; gap: 1.1rem; padding: 1rem; align-items: flex-start; }
        .item-pic { width: 120px; height: 120px; object-fit: cover; flex: 0 0 auto; border: 2.5px solid var(--ink); border-radius: 14px; box-shadow: 3px 3px 0 var(--ink); }
        .item-pic.none { display: flex; align-items: center; justify-content: center; text-align: center; font-size: 0.75rem; font-weight: 700; color: var(--ink-soft); border-style: dashed; background: #fff; }
        .item-body { flex: 1; display: grid; gap: 0.3rem; align-content: start; min-width: 0; }
        .item-name { font-family: "Fredoka", sans-serif; font-weight: 700; font-size: 1.25rem; margin: 0 0 0.15rem; }
        .field { margin: 0; word-break: break-word; }
        .field span { display: inline-block; min-width: 54px; margin-right: 0.55rem; font-size: 0.72rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.03em; color: var(--ink-soft); }
        .item-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.6rem; }
        .change, .delete { font-size: 0.9rem; padding: 0.4rem 0.9rem; box-shadow: 3px 3px 0 var(--ink); }
        .delete { background: var(--paper); color: var(--tomato); border-color: var(--tomato); box-shadow: 3px 3px 0 var(--tomato); }
        .delete:hover:not([disabled]) { background: var(--tomato); color: var(--paper); }
        .spin { display: inline-block; width: 14px; height: 14px; border: 2.5px solid currentColor; border-top-color: transparent; border-radius: 50%; animation: cart-spin 0.6s linear infinite; vertical-align: -2px; margin-right: 0.15rem; }
        .spin.sm { width: 12px; height: 12px; margin: 0; vertical-align: -1px; }
        @keyframes cart-spin { to { transform: rotate(360deg); } }
        .item-price { display: grid; gap: 0.4rem; text-align: right; flex: 0 0 auto; align-content: start; }
        .item-price .price { font-family: "Fredoka", sans-serif; font-size: 1.2rem; }
        .qty-stepper { display: flex; align-items: center; justify-content: flex-end; gap: 0.3rem; }
        .qty-btn { width: 28px; height: 28px; border: 2px solid var(--ink); border-radius: 8px; background: var(--paper); font-size: 1rem; font-weight: 700; line-height: 1; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 2px 2px 0 var(--ink); transition: transform .08s; padding: 0; }
        .qty-btn:hover:not([disabled]) { transform: translate(-1px, -1px); background: var(--mustard); }
        .qty-btn:disabled { opacity: 0.35; cursor: default; box-shadow: none; }
        .qty-count { font-family: "Fredoka", sans-serif; font-size: 1rem; font-weight: 700; min-width: 22px; text-align: center; }
        @media (max-width: 560px) { .item { flex-wrap: wrap; } .item-price { text-align: left; } .qty-stepper { justify-content: flex-start; } }
        .summary { padding: 1.4rem; display: grid; gap: 0.9rem; }
        .sub { display: flex; justify-content: space-between; font-family: "Fredoka", sans-serif; font-size: 1.3rem; margin: 0; }
        .policy { background: #cfe6e2; border: 2px solid var(--ink); border-radius: var(--radius-sm); padding: 0.9rem 1.1rem; display: grid; gap: 0.5rem; }
        .policy-h { font-family: "Fredoka", sans-serif; font-weight: 700; margin: 0; }
        .policy p { margin: 0; font-size: 0.95rem; line-height: 1.45; }
        .big { font-size: 1.15rem; }
        .muted { color: var(--ink-soft); }
        .small { font-size: 0.9rem; margin: 0; }
        .err { color: var(--tomato); font-weight: 700; }
      `}</style>
      <style>{emptyCss}</style>
    </div>
  );
}

const emptyCss = `
  .empty { padding: 2.5rem; text-align: center; display: grid; gap: 0.6rem; justify-items: center; }
  .empty .big { font-family: "Fredoka", sans-serif; font-size: 1.5rem; margin: 0; }
`;
