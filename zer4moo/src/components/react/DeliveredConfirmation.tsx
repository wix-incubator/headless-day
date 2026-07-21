import { useEffect, useState } from 'react';
import { THANK_YOU, THANK_YOU_DEFAULT } from '../../lib/thankyou';

type Recipient = { slug: string; name: string; portrait?: string };
type Order = {
  number: number; cowName: string; cowSlug: string; recipients: string[];
  recipientCows?: Recipient[];
  count: number; total: number; sender: string; deliveryPasture: string; deliveryDate: string;
};
const money = (n: number) => `₪${Math.round(n).toLocaleString('en-US')}`;

export default function DeliveredConfirmation() {
  const [order, setOrder] = useState<Order | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('zer4moo-order');
      if (raw) setOrder(JSON.parse(raw));
    } catch {}
    setReady(true);
  }, []);

  if (!ready) return null;

  if (!order) {
    return (
      <div className="card" style={{ padding: '2.5rem', textAlign: 'center', maxWidth: 560, margin: '0 auto' }}>
        <div style={{ fontSize: '3rem' }} aria-hidden="true">🐄</div>
        <h1 className="display-2">No delivery just yet</h1>
        <p className="muted">Build a bouquet and send it — this is where the joyful confirmation appears.</p>
        <a className="btn btn-primary btn-lg" href="/shop">Build a bouquet</a>
      </div>
    );
  }

  const recipients = order.recipients?.length ? order.recipients.join(', ') : order.cowName;
  const cows: Recipient[] = order.recipientCows?.length
    ? order.recipientCows
    : [{ slug: order.cowSlug, name: order.cowName }];
  return (
    <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
      <div style={{ fontSize: '3.4rem', lineHeight: 1 }} aria-hidden="true">🐄💨</div>
      <p className="eyebrow" style={{ marginTop: '1rem' }}>Order #{order.number} · confirmed</p>
      <h1 className="display-2" style={{ marginBottom: '0.4rem' }}>Your bouquet is grazing its way over.</h1>
      <p className="lead">
        Somewhere, a cow is about to have the best afternoon of her week. Here’s a thank-you note from {cows.length > 1 ? 'each of them' : 'her'}.
      </p>

      {/* A thank-you card per recipient cow */}
      <div style={{ display: 'grid', gap: 18, margin: '2rem 0' }}>
        {cows.map((c) => (
          <div key={c.slug || c.name} className="thanks-card">
            <div className="thanks-card__img">
              <img src={`/thankyou/${c.slug}.png`} alt={`${c.name} with a flower crown`} loading="lazy"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
            </div>
            <div className="thanks-card__body">
              <h3 style={{ marginTop: 0, marginBottom: 6, fontSize: '1.1rem' }}>A note from {c.name}</h3>
              <p className="quote" style={{ margin: 0, fontSize: '1.05rem' }}>
                “Dearest {order.sender || 'friend'} — {THANK_YOU[c.slug] || THANK_YOU_DEFAULT}”
              </p>
              <p className="muted" style={{ margin: '0.7rem 0 0' }}>— {c.name}, with a full mouth 🌸</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: '1.2rem 1.4rem', textAlign: 'left' }}>
        <Row k="Recipient(s)" v={recipients} />
        <Row k="Arrangements" v={String(order.count)} />
        {order.deliveryPasture && <Row k="Pasture" v={order.deliveryPasture} />}
        {order.deliveryDate && <Row k="Delivery date" v={order.deliveryDate} />}
        <Row k="Total" v={money(order.total)} bold />
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: '1.6rem' }}>
        <a className="btn btn-primary btn-lg" href="/shop">Send another</a>
        {order.cowSlug && <a className="btn btn-ghost btn-lg" href={`/herd/${order.cowSlug}`}>Visit {order.cowName}</a>}
      </div>
    </div>
  );
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '0.28rem 0', fontWeight: bold ? 700 : 500 }}>
      <span className="muted">{k}</span><span className={bold ? 'price' : ''} style={{ textAlign: 'right' }}>{v}</span>
    </div>
  );
}
