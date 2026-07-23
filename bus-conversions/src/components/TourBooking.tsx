import { useEffect, useMemo, useState } from "react";
import {
  getUpcomingTourSlots,
  createBooking,
  type TourSlot,
  type BookingData,
} from "../utils/booking-service";

const OLIVE = "#273B1F";
const ACCENT = "#DFFF4F";
const BORDER = "#D8D2BC";
const MUTED = "#6E665A";

const LEVEL_LABELS: Record<string, string> = {
  "shell-out": "Shell-Out",
  "road-ready": "Road-Ready",
  "full-home": "Full Home",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  fontSize: "12px",
  letterSpacing: "1.5px",
  textTransform: "uppercase",
  color: OLIVE,
  marginBottom: "6px",
};
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 13px",
  fontSize: "15px",
  fontFamily: "var(--font-body)",
  color: "#292222",
  background: "#fff",
  border: `1px solid ${BORDER}`,
  borderRadius: "5px",
  outline: "none",
};

export default function TourBooking() {
  const [slots, setSlots] = useState<TourSlot[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const prefill = useMemo(() => {
    if (typeof window === "undefined") return { level: "", config: "" };
    const p = new URLSearchParams(window.location.search);
    return { level: p.get("level") ?? "", config: p.get("config") ?? "" };
  }, []);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    slotIndex: "",
    partySize: "2",
    buildLevel: LEVEL_LABELS[prefill.level] ?? "Not sure yet",
    notes: prefill.config ? `Interested in: ${prefill.config}` : "",
  });

  useEffect(() => {
    let alive = true;
    getUpcomingTourSlots(8)
      .then((s) => alive && setSlots(s))
      .catch(() => alive && setLoadError(true));
    return () => {
      alive = false;
    };
  }, []);

  const onField = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slots || form.slotIndex === "") return;
    const slot = slots[Number(form.slotIndex)];
    if (!slot) return;

    setSubmitting(true);
    const data: BookingData = {
      name: form.name,
      email: form.email,
      phone: form.phone,
      address: "",
      notes: form.notes,
      partySize: form.partySize,
      buildLevel: form.buildLevel,
      config: prefill.config,
    };
    try {
      await createBooking(data, slot, new Date(slot.start));
      window.location.href = "/confirmation";
    } catch (err) {
      console.error(err);
      alert("There was a problem reserving your spot. Please try again.");
      setSubmitting(false);
    }
  };

  const hasSlots = slots && slots.length > 0;
  const allSaturdays = hasSlots && slots!.every((s) => s.isSaturday);

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
      <div
        className="display"
        style={{ fontSize: "clamp(20px,2.6vw,26px)", color: "#292222", lineHeight: 1, marginBottom: "2px", fontFamily: "var(--font-display)", fontWeight: 900 }}
      >
        Reserve your Saturday spot
      </div>

      <label style={{ display: "block" }}>
        <span style={labelStyle}>Name</span>
        <input name="name" value={form.name} onChange={onField} required placeholder="Your name" style={inputStyle} />
      </label>
      <label style={{ display: "block" }}>
        <span style={labelStyle}>Email</span>
        <input name="email" type="email" value={form.email} onChange={onField} required placeholder="you@email.com" style={inputStyle} />
      </label>
      <label style={{ display: "block" }}>
        <span style={labelStyle}>Phone</span>
        <input name="phone" type="tel" value={form.phone} onChange={onField} placeholder="(503) 000-0000" style={inputStyle} />
      </label>

      <label style={{ display: "block" }}>
        <span style={labelStyle}>
          {allSaturdays ? "Preferred Saturday" : "Preferred tour time"}
        </span>
        {slots === null && !loadError ? (
          <div style={{ ...inputStyle, color: MUTED }}>Loading open tour times…</div>
        ) : hasSlots ? (
          <select name="slotIndex" value={form.slotIndex} onChange={onField} required style={inputStyle}>
            <option value="">Pick a tour slot</option>
            {slots!.map((s, i) => (
              <option key={s.start} value={i}>
                {s.displayDate} · {s.displayTime}
              </option>
            ))}
          </select>
        ) : (
          <div style={{ ...inputStyle, color: MUTED, lineHeight: 1.4 }}>
            No open tour slots are published right now — email{" "}
            <a href="mailto:hello@busconversions.com" style={{ color: OLIVE, fontWeight: 600 }}>
              hello@busconversions.com
            </a>{" "}
            and we'll get you on the next Saturday.
          </div>
        )}
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
        <label style={{ display: "block" }}>
          <span style={labelStyle}>Party size</span>
          <select name="partySize" value={form.partySize} onChange={onField} style={inputStyle}>
            {["1", "2", "3", "4", "5+"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <label style={{ display: "block" }}>
          <span style={labelStyle}>Build level</span>
          <select name="buildLevel" value={form.buildLevel} onChange={onField} style={inputStyle}>
            {["Not sure yet", "Shell-Out", "Road-Ready", "Full Home"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>

      <label style={{ display: "block" }}>
        <span style={labelStyle}>What you want to see</span>
        <textarea
          name="notes"
          value={form.notes}
          onChange={onField}
          rows={3}
          placeholder="A bus mid-teardown? A finished galley? Tell us."
          style={{ ...inputStyle, resize: "vertical", minHeight: "70px" }}
        />
      </label>

      <button
        type="submit"
        disabled={submitting || !hasSlots}
        style={{
          marginTop: "4px",
          width: "100%",
          cursor: submitting || !hasSlots ? "not-allowed" : "pointer",
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: "17px",
          letterSpacing: "1px",
          textTransform: "uppercase",
          color: OLIVE,
          background: ACCENT,
          border: "none",
          padding: "15px",
          borderRadius: "5px",
          opacity: submitting || !hasSlots ? 0.6 : 1,
        }}
      >
        {submitting ? "Reserving…" : "Reserve your Saturday spot"}
      </button>
      <p style={{ margin: 0, fontSize: "13px", lineHeight: 1.5, color: MUTED, textAlign: "center" }}>
        No deposit to tour. Just show up and ask us anything.
      </p>
    </form>
  );
}
