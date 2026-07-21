import { useMemo, useState } from 'react';
import { addToCart, newId, type CartLine } from '../../lib/cart';
import type { Stem } from '../../lib/stems';
import FlowerField from './FlowerField';
import StemImg from './StemImg';
import AddOnArt from './AddOnArt';

type Cow = {
  slug: string; name: string; breed: string; age: number; mood: string;
  favoriteGreens: string[]; portrait?: string;
};
type AddOn = { name: string; price: number };

const money = (n: number) => `₪${Math.round(n).toLocaleString('en-US')}`;
const MIN_STEMS = 3;
const MAX_STEMS = 12;

function addonSlug(name: string): string | null {
  const n = name.toLowerCase();
  if (n.includes('salt')) return 'salt-lick';
  if (n.includes('carrot')) return 'carrot';
  if (n.includes('dandelion')) return 'dandelion-garnish';
  if (n.includes('bell') || n.includes('ribbon') || n.includes('wrap')) return 'bell-wrap';
  if (n.includes('apple')) return 'apple-confetti';
  return null;
}
function AddonImg({ name, size = 68 }: { name: string; size?: number }) {
  const slug = addonSlug(name);
  if (!slug) return <AddOnArt name={name} size={Math.round(size * 0.8)} />;
  return <img src={`/addons/${slug}.png`} alt="" style={{ width: size, height: size, objectFit: 'contain', display: 'block' }} loading="lazy" />;
}

// Where each add-on nestles into the bouquet illustration (positions are % of the stage).
type Place = { style: React.CSSProperties; w?: number; h?: number; src?: string };
const ADDON_PLACE: Record<string, Place[]> = {
  // a greens sprig in front of the other flowers
  'dandelion-garnish': [{ style: { left: '40%', bottom: '16%', zIndex: 45, transform: 'translateX(-50%) rotate(-16deg)', transformOrigin: 'bottom center' }, h: 104 }],
  // tied lower on the vase, over the wrap
  'bell-wrap': [{ style: { left: '50%', bottom: '13%', zIndex: 56, transform: 'translateX(-50%)' }, w: 42 }],
  // resting on the ground just left of the vase
  'salt-lick': [{ style: { left: '20%', bottom: '5%', zIndex: 48, transform: 'rotate(-6deg)' }, w: 44 }],
  // small, lying flat on the ground to the right of the vase (pivots at its base)
  carrot: [{ style: { left: '61%', bottom: '7%', zIndex: 48, transform: 'rotate(74deg)', transformOrigin: 'center bottom' }, w: 40 }],
  // a few single slices scattered around the bouquet
  'apple-confetti': [
    { src: '/addons/apple-slice.png', style: { top: '11%', left: '20%', zIndex: 58, transform: 'rotate(-22deg)' }, w: 26 },
    { src: '/addons/apple-slice.png', style: { top: '9%', right: '22%', zIndex: 58, transform: 'rotate(28deg)' }, w: 26 },
    { src: '/addons/apple-slice.png', style: { top: '28%', right: '13%', zIndex: 58, transform: 'rotate(-12deg)' }, w: 22 },
    { src: '/addons/apple-slice.png', style: { top: '32%', left: '12%', zIndex: 58, transform: 'rotate(14deg)' }, w: 22 },
  ],
};

function matchInfo(cow: Cow | null, stems: Stem[]) {
  if (!cow || !stems.length) return null;
  const greens = cow.favoriteGreens.map((s) => s.toLowerCase());
  const likes = cow.favoriteGreens.slice(0, 2).join(' and ');
  if (greens.includes('everything'))
    return { ok: true, text: `${cow.name} adores everything — this will be a guaranteed delight.` };
  const matched = stems.filter((s) => s.match.some((m) => greens.includes(m)));
  if (matched.length / stems.length >= 0.5)
    return { ok: true, text: `A lovely match — ${cow.name} favors ${likes}, and your bouquet leans right into it.` };
  return { ok: false, text: `${cow.name} tends to prefer ${likes}. She’ll still be delighted, but a stem or two of her favorites would suit her palate better.` };
}

export default function BouquetBuilder({
  stems, cows, addOns, initialStems, initialCow,
}: {
  stems: Stem[]; cows: Cow[]; addOns: AddOn[]; initialStems?: string[]; initialCow?: string;
}) {
  const stemById = useMemo(() => Object.fromEntries(stems.map((s) => [s.id, s])), [stems]);
  const [picks, setPicks] = useState<string[]>(() =>
    (initialStems || []).filter((id) => stemById[id]).slice(0, MAX_STEMS));
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [cowSlug, setCowSlug] = useState(initialCow || '');
  const [giftMessage, setGiftMessage] = useState('');
  const [added, setAdded] = useState(false);

  const cow = useMemo(() => cows.find((c) => c.slug === cowSlug) || null, [cowSlug, cows]);
  const pickedStems = picks.map((id) => stemById[id]).filter(Boolean) as Stem[];
  const chosenAddOns = addOns.filter((a) => selectedAddOns.includes(a.name));
  const stemsTotal = pickedStems.reduce((s, x) => s + x.price, 0);
  const unitPrice = stemsTotal + chosenAddOns.reduce((s, a) => s + a.price, 0);
  const match = matchInfo(cow, pickedStems);
  const counts = picks.reduce<Record<string, number>>((m, id) => ((m[id] = (m[id] || 0) + 1), m), {});

  const addStem = (id: string) => { if (picks.length < MAX_STEMS) setPicks((p) => [...p, id]); };
  const removeOne = (id: string) => {
    const i = picks.lastIndexOf(id);
    if (i !== -1) setPicks((p) => p.filter((_, idx) => idx !== i));
  };
  const toggleAddOn = (name: string) =>
    setSelectedAddOns((p) => (p.includes(name) ? p.filter((n) => n !== name) : [...p, name]));

  const bouquetName = () => {
    const flowers = pickedStems.filter((s) => s.kind === 'flower').length;
    if (flowers === 0) return 'Your hand-tied grass bouquet';
    if (flowers === pickedStems.length) return 'Your hand-tied wildflower bouquet';
    return 'Your hand-tied meadow bouquet';
  };

  const enough = picks.length >= MIN_STEMS;
  const handleAdd = () => {
    if (!cow || !enough) return;
    const line: CartLine = {
      id: newId(), bouquetName: bouquetName(),
      stems: pickedStems.map((s) => ({ id: s.id, name: s.name, price: s.price })),
      unitPrice, addOns: chosenAddOns.map((a) => ({ name: a.name, price: a.price })),
      cowSlug: cow.slug, cowName: cow.name, cowPortrait: cow.portrait, giftMessage,
    };
    addToCart(line);
    setAdded(true);
    setTimeout(() => { window.location.href = '/cart'; }, 550);
  };
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const onCta = () => {
    if (!enough) return scrollTo('s-stems');
    if (!cow) return scrollTo('s-cow');
    handleAdd();
  };
  const need = MIN_STEMS - picks.length;
  const ctaLabel = added ? 'Added ✓'
    : !enough ? `Add ${need} more stem${need > 1 ? 's' : ''}`
    : !cow ? 'Choose your cow ↓'
    : `Add to cart · ${money(unitPrice)}`;

  const bouquetStage = (
    <div className="bouquet-stage">
      {pickedStems.length === 0 && (
        <div className="bouquet-stage__empty">
          <div>
            <div style={{ fontSize: '2rem' }}>🌱</div>
            Your bouquet starts here.<br />Tap a flower in the field.
          </div>
        </div>
      )}
      {pickedStems.map((s, i) => {
        const n = pickedStems.length;
        const spread = Math.min(70, 13 * n);
        const rot = n === 1 ? 0 : spread * (i / (n - 1) - 0.5);
        return (
          <div key={picks[i] + '-' + i} className="stem-place"
            style={{ transform: `translateX(-50%) rotate(${rot}deg)`, zIndex: 10 + i,
              // @ts-ignore custom prop
              '--rot': `${rot}deg`, animation: i === n - 1 ? 'stemPop .4s ease' : undefined }}>
            <StemImg id={s.id} height={158} />
          </div>
        );
      })}
      {pickedStems.length > 0 && (
        <svg className="wrap-ribbon" viewBox="0 0 84 56" aria-hidden="true">
          <path d="M14 6 L70 6 L60 48 Q42 56 24 48 Z" fill="#EFE7D6" stroke="#E0D6BE" strokeWidth="1.5" />
          <rect x="8" y="20" width="68" height="12" rx="6" fill="#E4A0A6" />
          <path d="M42 26 q-12 -12 -20 -6 q6 8 20 6" fill="#DC9097" />
          <path d="M42 26 q12 -12 20 -6 q-6 8 -20 6" fill="#DC9097" />
          <circle cx="42" cy="26" r="3.5" fill="#D07E86" />
        </svg>
      )}
      {chosenAddOns.map((a) => {
        const slug = addonSlug(a.name);
        const places = (slug && ADDON_PLACE[slug]) || [];
        return places.map((p, i) => (
          <img key={a.name + i} className="bq-addon" src={p.src || `/addons/${slug}.png`} alt=""
            style={{ position: 'absolute', width: p.w, height: p.h ?? 'auto', ...p.style }} />
        ));
      })}
    </div>
  );

  return (
    <div className="builder-root">
      {/* 1 · Gather stems — full-bleed field */}
      <section id="s-stems" className="build-sec">
        <SecHead n={1} title="Gather your stems" sub="Wander the field and tap any flower — your bouquet is hand-tied as you go, and follows you as you scroll." />
        <FlowerField stems={stems} counts={counts} onPick={addStem}
          atMax={picks.length >= MAX_STEMS} total={stemsTotal} n={picks.length} />
      </section>

      {/* Two columns: the steps scroll on the left, the bouquet sticks on the right */}
      <div className="build-cols">
        <div className="build-cols__main">
          {/* 2 · Finishing touches */}
          <section id="s-extras" className="build-sec">
            <SecHead n={2} title="Finishing touches" sub="Optional flourishes, gift-wrapped alongside your bouquet. Tap to add." />
            <div className="extras-options">
              {addOns.map((a) => {
                const on = selectedAddOns.includes(a.name);
                return (
                  <button key={a.name} type="button" onClick={() => toggleAddOn(a.name)}
                    aria-pressed={on} className={`extra-card${on ? ' is-on' : ''}`}>
                    <span className="extra-card__img"><AddonImg name={a.name} size={68} /></span>
                    <span className="extra-card__body">
                      <span className="extra-card__name">{a.name}</span>
                      <span className="price" style={{ fontSize: '.92rem' }}>+{money(a.price)}</span>
                    </span>
                    <span aria-hidden="true" className="extra-card__check">{on ? '✓' : '+'}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 3 · Choose cow */}
          <section id="s-cow" className="build-sec">
            <SecHead n={3} title="Choose your cow" sub="Meet the herd and pick your recipient — we’ll match your stems to her taste." />
            <div className="cow-field" style={{ marginTop: 0 }}>
              <div className="cowgrid">
                {cows.map((c) => {
                  const active = c.slug === cowSlug;
                  return (
                    <button key={c.slug} type="button" onClick={() => setCowSlug(c.slug)}
                      aria-pressed={active} className={`cow-pick${active ? ' is-active' : ''}`}>
                      <span className="cow-pick__imgwrap">
                        <span className="cow-pick__clip">
                          {c.portrait
                            ? <img className="cow-pick__img" src={c.portrait} alt={`${c.name}, a ${c.breed} cow`} width={320} height={400} loading="lazy" />
                            : <span className="cow-pick__fallback">{c.name[0]}</span>}
                        </span>
                        <span className="cow-pick__mood">{c.mood}</span>
                        <span className="cow-pick__badge">🎀 Chosen</span>
                      </span>
                      <span className="cow-pick__body">
                        <span className="cow-pick__name">{c.name}</span>
                        <div className="cow-pick__meta">{c.breed} · {c.age} {c.age === 1 ? 'yr' : 'yrs'}</div>
                        <div className="cow-pick__greens">
                          {(c.favoriteGreens || []).slice(0, 3).map((g) => (
                            <span key={g} className="cow-pick__green">{g}</span>
                          ))}
                        </div>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            {cow && match ? (
              <div className={`florist-note ${match.ok ? 'florist-note--ok' : 'florist-note--note'}`}>
                <div className="florist-note__title" style={{ color: match.ok ? 'var(--color-primary)' : '#8a641f' }}>
                  {match.ok ? `🌸 A lovely match for ${cow.name}` : `🌾 A gentle note about ${cow.name}`}
                </div>
                <div>{match.text}</div>
              </div>
            ) : (
              <div className="florist-note florist-note--wait">
                <div>Pick a cow above to see how your bouquet suits her palate.</div>
              </div>
            )}
          </section>

          {/* 4 · Gift & send */}
          <section id="s-gift" className="build-sec">
            <SecHead n={4} title="Add a gift message" sub="We’ll include your note on the card. She will pretend to read it, then eat the bouquet — the highest compliment a cow can pay." />
            <div className="card" style={{ padding: 'clamp(1.25rem,3vw,2rem)' }}>
              <div className="field" style={{ background: 'none', border: 'none', padding: 0 }}>
                <label htmlFor="gm" style={{ display: 'block', fontWeight: 700, fontSize: '0.9rem', marginBottom: 6 }}>
                  Your note{cow ? ` to ${cow.name}` : ''}
                </label>
                <textarea id="gm" className="textarea" maxLength={240} value={giftMessage}
                  onChange={(e) => setGiftMessage(e.target.value)}
                  placeholder={`Dear ${cow ? cow.name : 'friend'}, you deserve every petal. Graze joyfully. —`} />
                <div className="muted" style={{ fontSize: '0.8rem', textAlign: 'right' }}>{giftMessage.length}/240</div>
              </div>
            </div>
          </section>
        </div>

        {/* Sticky bouquet — scrolls with you */}
        <aside className="build-cols__side">
          <div id="your-bouquet" className="bouquet-preview" style={{ margin: 0 }}>
            <h3 style={{ marginTop: 0, fontSize: '1.05rem' }}>Your bouquet</h3>
            {bouquetStage}
            {pickedStems.length > 0 && (
              <div style={{ borderTop: '1px solid var(--color-border)', marginTop: 10, paddingTop: 10 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {stems.filter((s) => counts[s.id]).map((s) => (
                    <button key={s.id} className="chip" onClick={() => removeOne(s.id)}
                      title={`Remove one ${s.name}`}
                      style={{ cursor: 'pointer', display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                      {s.name}{counts[s.id] > 1 ? ` ×${counts[s.id]}` : ''} <span aria-hidden="true">✕</span>
                    </button>
                  ))}
                </div>
                {chosenAddOns.length > 0 && (
                  <div className="muted" style={{ fontSize: '.82rem', marginTop: 8 }}>
                    + {chosenAddOns.map((a) => a.name).join(', ')}
                  </div>
                )}
                <div className="price" style={{ marginTop: 10, fontSize: '1.25rem' }}>{money(unitPrice)}
                  <span className="muted" style={{ fontWeight: 500, fontSize: '0.85rem' }}> · {picks.length} stem{picks.length > 1 ? 's' : ''}</span>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Sticky build bar */}
      <div className="pickbar">
        <div className="pickbar__inner">
          <div className="pickbar__types">
            {picks.length === 0
              ? <span className="muted" style={{ fontSize: '.85rem' }}>Tap flowers in the field to begin…</span>
              : stems.filter((s) => counts[s.id]).map((s) => (
                <button key={s.id} className="pickbar__chip" onClick={() => removeOne(s.id)}
                  title={`Remove one ${s.name}`} aria-label={`Remove one ${s.name}`}>
                  <StemImg id={s.id} height={38} />
                  {counts[s.id] > 1 && <span className="pickbar__x">×{counts[s.id]}</span>}
                </button>
              ))}
          </div>
          <div className="pickbar__right">
            {picks.length > 0 && (
              <div>
                <div className="price" style={{ fontSize: '1.1rem', lineHeight: 1 }}>{money(unitPrice)}</div>
                <div className="muted" style={{ fontSize: '.78rem' }}>{picks.length} stem{picks.length > 1 ? 's' : ''}{chosenAddOns.length ? ` · ${chosenAddOns.length} extra${chosenAddOns.length > 1 ? 's' : ''}` : ''}</div>
              </div>
            )}
            <button className="btn btn-primary" onClick={onCta} disabled={added}>{ctaLabel}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SecHead({ n, title, sub }: { n: number; title: string; sub: string }) {
  return (
    <div className="build-sec__head">
      <div className="build-sec__title">
        <span className="build-sec__num">{n}</span>
        <h2 style={{ margin: 0 }}>{title}</h2>
      </div>
      <p className="muted" style={{ margin: '.4rem 0 0' }}>{sub}</p>
    </div>
  );
}
