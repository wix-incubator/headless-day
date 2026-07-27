import { useState } from "react";

export default function ContactForm() {
  const [form, setForm] = useState({ first_name: "", email: "", phone: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const r = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (d.ok) setSent(true);
      else setErr(d.error || "Could not send. Try again?");
    } catch {
      setErr("Could not send. Try again?");
    } finally {
      setBusy(false);
    }
  }

  if (sent)
    return (
      <div className="thanks card">
        <p className="big">Message sent! 💌</p>
        <p>Thank you — it's just me here, so I'll write back as soon as I'm out of the studio (usually within a day or two).</p>
        <a className="btn ghost" href="/shop">Have a peek at the vases</a>
        <style>{css}</style>
      </div>
    );

  return (
    <form className="contact card" onSubmit={submit}>
      <label>
        Your name
        <input name="first_name" value={form.first_name} onChange={set("first_name")} required />
      </label>
      <label>
        Email
        <input name="email" type="email" value={form.email} onChange={set("email")} required />
      </label>
      <label>
        Phone <span className="opt">(optional)</span>
        <input name="phone" value={form.phone} onChange={set("phone")} />
      </label>
      <label>
        Your message
        <textarea
          name="message"
          rows={5}
          value={form.message}
          onChange={set("message")}
          placeholder="Tell me who your vase is for, any colours or details you love, and roughly when you'd need it."
          required
        />
      </label>
      <button className="btn tomato big" disabled={busy}>{busy ? "Sending…" : "Send message"}</button>
      {err && <p className="err">{err}</p>}
      <style>{css}</style>
    </form>
  );
}

const css = `
  .contact { padding: 1.6rem; display: grid; gap: 1rem; }
  .contact label { display: grid; gap: 0.35rem; font-weight: 800; }
  .contact input, .contact textarea { font-family: inherit; font-size: 1rem; border: 2.5px solid var(--ink); border-radius: 14px; padding: 0.7rem; background: #fff; }
  .contact textarea { resize: vertical; }
  .opt { font-weight: 500; color: var(--ink-soft); }
  .big { font-size: 1.1rem; }
  .err { color: var(--tomato); font-weight: 700; margin: 0; }
  .thanks { padding: 2rem; text-align: center; display: grid; gap: 0.7rem; justify-items: center; }
  .thanks .big { font-family: "Fredoka", sans-serif; font-size: 1.5rem; margin: 0; }
`;
