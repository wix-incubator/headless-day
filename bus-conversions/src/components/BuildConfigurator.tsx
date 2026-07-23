import { useMemo, useState } from "react";

interface Level { slug: string; name: string; priceLow: number; priceHigh: number; duration: string; }
interface Model { slug: string; name: string; sleeps: string; blurb: string; }
interface AddOn { id: string; label: string; price: number; includedFrom?: string[]; }

interface Props {
  levels: Level[];
  models: Model[];
}

const ADDONS: AddOn[] = [
  { id: "solar", label: "Roof solar array", price: 6500, includedFrom: [] },
  { id: "wetbath", label: "Full wet bath", price: 9000, includedFrom: ["full-home"] },
  { id: "cabinetry", label: "Reclaimed-fir cabinetry", price: 12000, includedFrom: ["full-home"] },
  { id: "stove", label: "Wood-stove corner", price: 3200 },
  { id: "deck", label: "Roof deck + escape hatch", price: 5500 },
  { id: "sign", label: "Destination roll sign, rewired & lit", price: 1800, includedFrom: ["full-home"] },
];

const fmt = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
const ACCENT = "#DFFF4F";
const OLIVE = "#273B1F";
const BORDER = "#D8D2BC";

export default function BuildConfigurator({ levels, models }: Props) {
  const [levelSlug, setLevelSlug] = useState(levels[1]?.slug ?? levels[0].slug);
  const [modelSlug, setModelSlug] = useState(models[1]?.slug ?? models[0].slug);
  const [lengthFt, setLengthFt] = useState<35 | 40>(40);
  const [picked, setPicked] = useState<Record<string, boolean>>({});

  const level = levels.find((l) => l.slug === levelSlug)!;
  const model = models.find((m) => m.slug === modelSlug)!;

  const isIncluded = (a: AddOn) => a.includedFrom?.includes(levelSlug) ?? false;

  const estimate = useMemo(() => {
    const lengthMult = lengthFt === 40 ? 1.08 : 1;
    let low = level.priceLow * lengthMult;
    let high = level.priceHigh * lengthMult;
    for (const a of ADDONS) {
      if (isIncluded(a)) continue;
      if (picked[a.id]) {
        low += a.price;
        high += a.price;
      }
    }
    return { low, high };
  }, [levelSlug, lengthFt, picked]);

  const selectedAddons = ADDONS.filter((a) => picked[a.id] && !isIncluded(a)).map((a) => a.label);
  const configSummary = `${level.name} · ${lengthFt} ft · ${model.name} layout${selectedAddons.length ? " · " + selectedAddons.join(", ") : ""}`;
  const bookHref = `/visit?level=${levelSlug}&model=${modelSlug}&config=${encodeURIComponent(configSummary)}`;

  const chip = (active: boolean): React.CSSProperties => ({
    cursor: "pointer",
    fontFamily: "var(--font-display)",
    fontWeight: 700,
    fontSize: "14px",
    letterSpacing: ".5px",
    textTransform: "uppercase",
    padding: "11px 16px",
    borderRadius: "5px",
    border: active ? `2px solid ${OLIVE}` : `1px solid ${BORDER}`,
    background: active ? OLIVE : "#fff",
    color: active ? "#EFE5D8" : "#292222",
    transition: "all .15s ease",
  });

  const labelStyle: React.CSSProperties = {
    fontFamily: "var(--font-display)",
    fontWeight: 700,
    fontSize: "12px",
    letterSpacing: "1.5px",
    textTransform: "uppercase",
    color: OLIVE,
    marginBottom: "10px",
    display: "block",
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))",
        gap: "clamp(20px,3vw,36px)",
        background: "var(--color-surface)",
        border: `1px solid ${BORDER}`,
        borderRadius: "10px",
        padding: "clamp(22px,4vw,38px)",
        alignItems: "start",
      }}
    >
      {/* Controls */}
      <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
        <div>
          <span style={labelStyle}>Build level</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {levels.map((l) => (
              <button key={l.slug} type="button" style={chip(l.slug === levelSlug)} onClick={() => setLevelSlug(l.slug)}>
                {l.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span style={labelStyle}>Length</span>
          <div style={{ display: "flex", gap: "8px" }}>
            {[35, 40].map((ft) => (
              <button key={ft} type="button" style={chip(lengthFt === ft)} onClick={() => setLengthFt(ft as 35 | 40)}>
                {ft} ft
              </button>
            ))}
          </div>
        </div>

        <div>
          <span style={labelStyle}>Interior layout</span>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            {models.map((m) => {
              const on = m.slug === modelSlug;
              return (
                <button
                  key={m.slug}
                  type="button"
                  onClick={() => setModelSlug(m.slug)}
                  aria-pressed={on}
                  style={{
                    cursor: "pointer",
                    textAlign: "left",
                    padding: "12px 14px",
                    borderRadius: "6px",
                    border: on ? `2px solid ${OLIVE}` : `1px solid ${BORDER}`,
                    background: on ? OLIVE : "#fff",
                    color: on ? "#EFE5D8" : "#292222",
                  }}
                >
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, textTransform: "uppercase", fontSize: "16px" }}>{m.name}</div>
                  <div style={{ fontSize: "12px", color: on ? "#c7d0a8" : "var(--color-text-muted)", marginTop: "2px" }}>{m.sleeps}</div>
                </button>
              );
            })}
          </div>
          <p style={{ margin: "10px 0 0", fontSize: "14px", lineHeight: 1.5, color: "var(--color-text-muted)" }}>{model.blurb}</p>
        </div>

        <div>
          <span style={labelStyle}>Add-ons</span>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {ADDONS.map((a) => {
              const included = isIncluded(a);
              const on = included || !!picked[a.id];
              return (
                <label
                  key={a.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    padding: "11px 14px",
                    borderRadius: "6px",
                    border: `1px solid ${BORDER}`,
                    background: on ? "rgba(39,59,31,.06)" : "#fff",
                    cursor: included ? "default" : "pointer",
                    opacity: included ? 0.85 : 1,
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "15px" }}>
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={included}
                      onChange={(e) => setPicked((p) => ({ ...p, [a.id]: e.target.checked }))}
                      style={{ width: "18px", height: "18px", accentColor: OLIVE }}
                    />
                    {a.label}
                  </span>
                  <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "13px", color: included ? "var(--color-text-muted)" : OLIVE }}>
                    {included ? "Included" : "+" + fmt(a.price)}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      {/* Estimate panel */}
      <div
        style={{
          position: "sticky",
          top: "88px",
          background: OLIVE,
          color: "#EFE5D8",
          borderRadius: "10px",
          padding: "clamp(22px,3vw,30px)",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "12px", letterSpacing: "2px", textTransform: "uppercase", color: ACCENT }}>
          Your build, roughly
        </div>
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "clamp(30px,5vw,46px)", lineHeight: 1, color: ACCENT }}>
            {fmt(estimate.low)}<span style={{ color: "#9aa088" }}>–</span>{fmt(estimate.high)}
          </div>
          <div style={{ fontSize: "13px", color: "#c7c9b6", marginTop: "6px" }}>
            Estimate only · not counting the bus itself · {level.duration}
          </div>
        </div>
        <div style={{ borderTop: "1px solid rgba(216,210,188,.2)", paddingTop: "14px", fontSize: "15px", lineHeight: 1.5 }}>
          <strong style={{ color: "#fff", fontWeight: 600 }}>{configSummary}</strong>
        </div>
        <a
          href={bookHref}
          style={{
            marginTop: "4px",
            display: "block",
            textAlign: "center",
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "16px",
            letterSpacing: ".5px",
            textTransform: "uppercase",
            color: OLIVE,
            background: ACCENT,
            padding: "15px",
            borderRadius: "6px",
            textDecoration: "none",
          }}
        >
          Tour a build like this →
        </a>
        <p style={{ margin: 0, fontSize: "12px", lineHeight: 1.5, color: "#9aa088", textAlign: "center" }}>
          We'll have a bus at this stage in the shop. Walk through it on a Saturday before you commit.
        </p>
      </div>
    </div>
  );
}
