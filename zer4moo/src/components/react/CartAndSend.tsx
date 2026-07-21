import { useEffect, useState } from 'react';
import { getCart, removeLine, clearCart, onCartChange, type CartLine } from '../../lib/cart';
import StemImg from './StemImg';

const money = (n: number) => `₪${Math.round(n).toLocaleString('en-US')}`;
const DELIVERY_FEE = 18;

// Pastures we currently deliver to — set options for the delivery dropdown.
const PASTURES = [
  'The North Field · Greenfield Farm',
  'The South Meadow · Greenfield Farm',
  'Clover Hollow',
  'Buttercup Pasture',
  'Willowbank Field',
  'Sunrise Paddock',
  'Daisy Dell',
  'The Home Field',
];

export default function CartAndSend() {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [form, setForm] = useState({ senderName: '', senderEmail: '', deliveryPasture: '', deliveryDate: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setLines(getCart());
    setReady(true);
    return onCartChange(() => setLines(getCart()));
  }, []);

  const subtotal = lines.reduce((s, l) => s + l.unitPrice, 0);
  const total = lines.length ? subtotal + DELIVERY_FEE : 0;

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.senderName.trim()) e.senderName = 'Please tell us who this is from.';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.senderEmail)) e.senderEmail = 'A valid email, so we can send the photo.';
    if (!form.deliveryPasture.trim()) e.deliveryPasture = 'Where is her pasture?';
    if (!form.deliveryDate) e.deliveryDate = 'Choose a delivery date.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSend = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!lines.length || !validate()) return;
    setSending(true);
    const recipients = [...new Set(lines.map((l) => l.cowName))];
    const seen = new Set<string>();
    const recipientCows = lines
      .filter((l) => (seen.has(l.cowSlug) ? false : (seen.add(l.cowSlug), true)))
      .map((l) => ({ slug: l.cowSlug, name: l.cowName, portrait: l.cowPortrait || '' }));
    const order = {
      number: 7 + Math.floor(Math.random() * 990),
      cowName: lines[0]?.cowName || 'your cow',
      cowSlug: lines[0]?.cowSlug || '',
      recipients,
      recipientCows,
      count: lines.length,
      total,
      sender: form.senderName,
      deliveryPasture: form.deliveryPasture,
      deliveryDate: form.deliveryDate,
    };
    try { sessionStorage.setItem('zer4moo-order', JSON.stringify(order)); } catch {}

    // Record the order into the Wix CMS (Orders collection) via the backend route.
    const payload = {
      orderNumber: order.number,
      senderName: form.senderName,
      senderEmail: form.senderEmail,
      recipient: recipients.join(', '),
      bouquet: lines.map((l) => l.bouquetName).join(' | '),
      stems: lines.flatMap((l) => (l.stems || []).map((s) => s.name)).join(', '),
      addOns: [...new Set(lines.flatMap((l) => (l.addOns || []).map((a) => a.name)))].join(', '),
      giftMessage: lines.map((l) => l.giftMessage).filter(Boolean).join(' / '),
      deliveryPasture: form.deliveryPasture,
      deliveryDate: form.deliveryDate,
      total,
      status: 'received',
    };
    try {
      await fetch('/api/order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    } catch {}

    clearCart();
    window.location.href = '/delivered';
  };

  if (!ready) return <p className="muted">Gathering your greens…</p>;

  if (sending) {
    return (
      <div className="card" style={{ padding: '2.5rem', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem' }} aria-hidden="true">🐄💨</div>
        <h2>Sending your bouquet…</h2>
        <p className="muted">Tying the ribbon and sending it grazing.</p>
      </div>
    );
  }

  if (!lines.length) {
    return (
      <div className="card" style={{ padding: '2.5rem', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem' }} aria-hidden="true">🌾</div>
        <h2>Your basket is empty</h2>
        <p className="muted measure mx-auto">No bouquet is grazing its way anywhere just yet. Let’s fix that — every cow deserves to feel chosen.</p>
        <a className="btn btn-primary btn-lg" href="/shop" style={{ marginTop: '0.5rem' }}>Build a bouquet</a>
      </div>
    );
  }

  return (
    <div className="cart-grid">
      {/* Left — lines + form */}
      <div>
        <div style={{ display: 'grid', gap: 14 }}>
          {lines.map((l) => (
            <div key={l.id} className="card" style={{ flexDirection: 'row', alignItems: 'stretch', overflow: 'hidden' }}>
              <div style={{ width: 92, flex: '0 0 92px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: -6, background: 'linear-gradient(180deg,#EAF0DC,#D6E4BE)', overflow: 'hidden', paddingBottom: 4 }} aria-hidden="true">
                {(l.stems ?? []).slice(0, 3).map((s, i) => (
                  <span key={i} style={{ marginInline: -6 }}><StemImg id={s.id} height={70} /></span>
                ))}
              </div>
              <div style={{ padding: '0.85rem 1rem', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <strong style={{ fontFamily: 'var(--font-display)', color: 'var(--color-primary)', fontSize: '1.1rem' }}>{l.bouquetName}</strong>
                  <span className="price">{money(l.unitPrice)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 3 }}>
                  {l.cowPortrait && <img src={l.cowPortrait} alt="" width={26} height={26} style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover', flex: '0 0 26px', border: '1px solid var(--color-border)' }} />}
                  <span className="muted" style={{ fontSize: '0.85rem' }}>{(l.stems ?? []).length} stems · for <strong style={{ color: 'var(--color-primary)' }}>{l.cowName}</strong></span>
                </div>
                {l.addOns.length > 0 && <div className="muted" style={{ fontSize: '0.82rem', marginTop: 2 }}>+ {l.addOns.map((a) => a.name).join(', ')}</div>}
                {l.giftMessage && <div style={{ fontSize: '0.85rem', fontStyle: 'italic', marginTop: 6, color: 'var(--color-text)' }}>“{l.giftMessage}”</div>}
                <button onClick={() => removeLine(l.id)} className="linklike" style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 0, marginTop: 6, textDecoration: 'underline', fontSize: '0.82rem' }}>Remove</button>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSend} noValidate style={{ marginTop: 22 }}>
          <h2 style={{ fontSize: '1.4rem' }}>Where is she grazing?</h2>
          <p className="muted" style={{ marginTop: '-0.4rem' }}>No payment details — checkout is theatrical. We only need to know where to send the joy.</p>
          <Field id="senderName" label="Your name" required err={errors.senderName}>
            <input id="senderName" className="input" value={form.senderName} onChange={(e) => set('senderName', e.target.value)} autoComplete="name" />
          </Field>
          <Field id="senderEmail" label="Your email" required err={errors.senderEmail}>
            <input id="senderEmail" className="input" type="email" value={form.senderEmail} onChange={(e) => set('senderEmail', e.target.value)} autoComplete="email" placeholder="so we can send you the photo" />
          </Field>
          <Field id="deliveryPasture" label="Delivery pasture" required err={errors.deliveryPasture}>
            <select id="deliveryPasture" className="input" value={form.deliveryPasture} onChange={(e) => set('deliveryPasture', e.target.value)}>
              <option value="" disabled>Choose a pasture…</option>
              {PASTURES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </Field>
          <Field id="deliveryDate" label="Delivery date" required err={errors.deliveryDate}>
            <input id="deliveryDate" className="input" type="date" value={form.deliveryDate} onChange={(e) => set('deliveryDate', e.target.value)} />
          </Field>
          <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={sending} style={{ marginTop: 8 }}>
            {sending ? 'Sending…' : `Send the bouquet · ${money(total)}`}
          </button>
        </form>
      </div>

      {/* Right — summary */}
      <aside className="card" style={{ padding: '1.4rem 1.5rem', position: 'sticky', top: 88 }}>
        <h3 style={{ marginTop: 0 }}>Order summary</h3>
        <SumRow k={`Arrangements (${lines.length})`} v={money(subtotal)} />
        <SumRow k="Pasture delivery" v={money(DELIVERY_FEE)} />
        <div style={{ borderTop: '1px solid var(--color-border)', margin: '0.7rem 0' }} />
        <SumRow k="Total" v={money(total)} bold />
        <p className="muted" style={{ fontSize: '0.82rem', marginTop: '1rem' }}>
          Every arrangement is hand-tied from food-grade greens and matched to your cow’s taste profile. If it doesn’t suit her palate, we’ll gently flag it before you send.
        </p>
        <a href="/shop" className="btn btn-ghost btn-block" style={{ marginTop: 6 }}>Add another arrangement</a>
      </aside>
    </div>
  );
}

function Field({ id, label, required, err, children }: { id: string; label: string; required?: boolean; err?: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label} {required && <span className="req" aria-hidden="true">*</span>}</label>
      {children}
      {err && <div style={{ color: '#a84a52', fontSize: '0.82rem', marginTop: 4 }}>{err}</div>}
    </div>
  );
}
function SumRow({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', fontWeight: bold ? 700 : 500, fontSize: bold ? '1.1rem' : '1rem' }}>
      <span>{k}</span><span className={bold ? 'price' : ''}>{v}</span>
    </div>
  );
}
