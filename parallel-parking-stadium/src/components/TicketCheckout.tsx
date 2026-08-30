import { useState } from 'react';
import type { ReactNode } from 'react';
import type { Tournament, Tier } from '../data/seed';

type Props = {
  tournaments: Pick<Tournament, 'id' | 'title' | 'date' | 'time' | 'bracket' | 'status' | 'seats'>[];
  tiers: Tier[];
  initialDate?: string;
};

const Y = 'var(--yellow)'; /* fills / selection borders only */
const GOLD = 'var(--gold)'; /* legible yellow-tone text on light */
const BORDER = 'var(--grid)';
const PANEL = 'var(--panel)';
const INK = 'var(--ink)';
const DIM = 'var(--ink-dim)';

function validEmail(e: string) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);
}

export default function TicketCheckout({ tournaments, tiers, initialDate }: Props) {
  const first = tournaments[0];
  const [date, setDate] = useState(
    initialDate && tournaments.some((t) => t.id === initialDate) ? initialDate : first?.id,
  );
  const [tier, setTier] = useState('The Curb');
  const [qty, setQty] = useState(2);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [tried, setTried] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState('');

  const sel = tournaments.find((t) => t.id === date) ?? first;
  const tierObj = tiers.find((t) => t.name === tier) ?? tiers[0];
  const subtotal = tierObj.price * qty;

  const nameBad = tried && !name.trim();
  const emailBad = tried && !validEmail(email);

  async function submit() {
    setTried(true);
    setServerError('');
    if (!name.trim() || !validEmail(email)) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          tournamentId: date,
          tournamentTitle: sel?.title,
          seatingTier: tier,
          quantity: qty,
          total: subtotal,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || 'Could not hold your seats. Try again.');
      }
      setSubmitted(true);
      window.scrollTo(0, 0);
    } catch (err: any) {
      setServerError(err?.message ?? 'Could not hold your seats. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setSubmitted(false);
    setTried(false);
    setServerError('');
  }

  if (submitted) {
    return (
      <div
        className="panel panel-y"
        style={{ maxWidth: 640, margin: '20px auto 0', padding: 'clamp(28px,5vw,48px)', textAlign: 'center' }}
      >
        <div className="arcade" style={{ fontSize: 14, color: 'var(--cyan)', marginBottom: 14 }}>★ Stage clear ★</div>
        <div className="dk" style={{ fontSize: 'clamp(40px,8vw,72px)', color: GOLD, lineHeight: 0.9, textShadow: '4px 4px 0 rgba(25,27,38,.16)' }}>
          YOU’RE IN.
        </div>
        <p style={{ margin: '18px auto 0', maxWidth: 460, fontSize: 19, lineHeight: 1.45, color: INK }}>
          Seats are held under your name and the bracket is set. We’ll email your tickets and the gate time.
          Don’t be late — the first park waits for no one.
        </p>
        <div style={{ margin: '26px auto 0', maxWidth: 360, background: 'var(--bg)', border: `2px solid ${BORDER}`, padding: 18, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Row l="Night" v={`${sel?.title} · ${sel?.date}`} />
          <Row l="Tier" v={`${tier} × ${qty}`} />
          <Row l="Total" v={`$${subtotal}`} big />
        </div>
        <button onClick={reset} className="btn btn-ghost" style={{ marginTop: 24 }}>↺ Book another night</button>
      </div>
    );
  }

  return (
    <div className="ticket-grid">
      <style
        dangerouslySetInnerHTML={{
          __html: `.ticket-grid{display:grid;grid-template-columns:1fr;gap:22px;align-items:start}
@media(min-width:860px){.ticket-grid{grid-template-columns:1.5fr .9fr}}`,
        }}
      />

      {/* form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
        {/* date */}
        <div>
          <div className="lbl" style={stepLabel}>1 · Pick a night</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tournaments.map((o) => (
              <button
                key={o.id}
                onClick={() => setDate(o.id)}
                className="panel"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                  borderColor: date === o.id ? Y : BORDER,
                  padding: '15px 18px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  color: INK,
                }}
              >
                <span>
                  <span className="dk" style={{ fontSize: 19, display: 'block' }}>{o.title}</span>
                  <span className="lbl" style={{ fontSize: 10, color: DIM }}>{o.date} · {o.time} · {o.bracket}</span>
                </span>
                <span className="lbl" style={{ fontSize: 10, color: o.status === 'Almost sold out' ? 'var(--magenta)' : 'var(--cyan)' }}>
                  {o.status === 'Almost sold out' ? `${o.seats} left` : 'On sale'}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* tier */}
        <div>
          <div className="lbl" style={stepLabel}>2 · Pick a tier</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 10 }}>
            {tiers.map((ti) => (
              <button
                key={ti.name}
                onClick={() => setTier(ti.name)}
                className="panel"
                style={{
                  textAlign: 'left',
                  borderColor: tier === ti.name ? Y : BORDER,
                  padding: 16,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  color: INK,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span className="dk" style={{ fontSize: 18 }}>{ti.name}</span>
                  <span className="dk" style={{ fontSize: 20, color: GOLD }}>${ti.price}</span>
                </div>
                <span style={{ fontSize: 16, color: DIM, lineHeight: 1.3 }}>{ti.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* details */}
        <div>
          <div className="lbl" style={stepLabel}>3 · Your details</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              <Field label="Full name">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mariana Pas" style={input(nameBad)} />
              </Field>
              <Field label="Email">
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" style={input(emailBad)} />
              </Field>
            </div>
            <div>
              <label className="lbl" style={fieldLabel}>Quantity</label>
              <div style={{ display: 'flex', alignItems: 'center', width: 'fit-content', border: `2px solid ${BORDER}` }}>
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} style={qtyBtn} aria-label="Decrease quantity">−</button>
                <span className="dk" style={{ width: 56, textAlign: 'center', fontSize: 22, color: INK }}>{qty}</span>
                <button onClick={() => setQty((q) => Math.min(12, q + 1))} style={qtyBtn} aria-label="Increase quantity">+</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* summary */}
      <div className="panel" style={{ background: 'var(--bg-2)', padding: 24, position: 'sticky', top: 90 }}>
        <div className="arcade" style={{ fontSize: 11, color: GOLD, marginBottom: 16 }}>Order summary</div>
        <SumRow l="Night" v={`${sel?.title} · ${sel?.date}`} />
        <SumRow l="Tier" v={tier} />
        <SumRow l={`Tickets × ${qty}`} v={`$${subtotal}`} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '16px 0 18px' }}>
          <span className="lbl" style={{ fontSize: 12 }}>Total</span>
          <span className="dk" style={{ fontSize: 38, color: GOLD, textShadow: '3px 3px 0 rgba(25,27,38,.16)' }}>${subtotal}</span>
        </div>
        <button onClick={submit} disabled={submitting} className="btn" style={{ width: '100%', justifyContent: 'center', opacity: submitting ? 0.7 : 1 }}>
          {submitting ? 'Holding seats…' : '▶ Buy tickets now'}
        </button>
        {(serverError || (tried && (nameBad || emailBad))) && (
          <p style={{ margin: '12px 0 0', fontSize: 16, color: 'var(--magenta)', textAlign: 'center' }}>
            {serverError || 'Add your name and a valid email to hold the seats.'}
          </p>
        )}
        <p style={{ margin: '14px 0 0', fontSize: 15, lineHeight: 1.35, color: DIM, textAlign: 'center' }}>
          Seats are held the moment you check out. No account, no spam.
        </p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ flex: 1, minWidth: 180 }}>
      <label className="lbl" style={fieldLabel}>{label}</label>
      {children}
    </div>
  );
}

function Row({ l, v, big }: { l: string; v: string; big?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <span className="lbl" style={{ fontSize: 10, color: DIM }}>{l}</span>
      <span className={big ? 'dk' : ''} style={{ fontSize: big ? 22 : 16, color: big ? GOLD : INK }}>{v}</span>
    </div>
  );
}

function SumRow({ l, v }: { l: string; v: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${BORDER}`, gap: 12 }}>
      <span style={{ fontSize: 17, color: DIM }}>{l}</span>
      <span style={{ fontSize: 17, textAlign: 'right', maxWidth: '60%', color: INK }}>{v}</span>
    </div>
  );
}

const stepLabel = { fontSize: 11, color: 'var(--cyan)', marginBottom: 12 } as const;
const fieldLabel = { fontSize: 10, color: DIM, display: 'block', marginBottom: 6 } as const;
const qtyBtn = {
  width: 46,
  height: 46,
  background: PANEL,
  border: 'none',
  fontSize: 22,
  cursor: 'pointer',
  color: INK,
  fontFamily: 'var(--font-body)',
} as const;
function input(bad: boolean) {
  return {
    width: '100%',
    padding: '12px 14px',
    border: `2px solid ${bad ? 'var(--magenta)' : BORDER}`,
    fontFamily: 'var(--font-body)',
    fontSize: 20,
    background: 'var(--bg)',
    color: INK,
  } as const;
}
