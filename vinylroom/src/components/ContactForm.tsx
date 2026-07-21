"use client";

import { FormEvent, useState } from "react";

const CONTACT_API = `${process.env.NEXT_PUBLIC_WIX_APP_API_URL ?? "https://tsksxe-881f90aac2a74e41-irakliyt.wix-host.com"}/api/contact`;

export default function ContactForm() {
  const [state, setState] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("Tell us about a room, partnership, or anything else.");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "sending") return;
    const form = event.currentTarget;
    const values = new FormData(form);
    setState("sending");
    setMessage("Sending your message…");

    try {
      const response = await fetch(CONTACT_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(values.get("name") ?? "").trim(),
          email: String(values.get("email") ?? "").trim(),
          message: String(values.get("message") ?? "").trim(),
        }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error || "Could not send your message right now.");
      form.reset();
      setState("success");
      setMessage(result.message || "Message received. We’ll get back to you soon.");
    } catch (error) {
      setState("error");
      const raw = error instanceof Error ? error.message : "";
      setMessage(raw && raw !== "Not found." ? raw : "Contact is temporarily unavailable. Please try again shortly.");
    }
  }

  const fieldClass = "min-h-12 w-full rounded-2xl border border-edge-strong bg-void/65 px-5 py-3 text-sm text-cream outline-none transition-[border-color,box-shadow] placeholder:text-dust/70 focus:border-amber/70 focus:shadow-[0_0_0_4px_rgba(226,165,82,0.1)]";

  return (
    <section id="contact" className="scroll-mt-28 rounded-[1.75rem] border border-amber/20 bg-[linear-gradient(145deg,rgba(45,28,19,0.72),rgba(8,7,6,0.94))] p-6 sm:p-9 lg:p-11">
      <div className="grid gap-7 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12">
        <div>
          <span className="eyebrow text-amber">Contact the room</span>
          <h2 className="mt-3 font-display text-4xl text-cream sm:text-5xl">Let’s talk records.</h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-parchment">
            Hosting question, collaboration idea, or something that needs a human? Leave the details here.
          </p>
        </div>

        <form onSubmit={submit} className="grid min-w-0 gap-3 sm:grid-cols-2">
          <label className="sr-only" htmlFor="contact-name">Name</label>
          <input id="contact-name" name="name" required maxLength={120} autoComplete="name" placeholder="Your name" className={fieldClass} />
          <label className="sr-only" htmlFor="contact-email">Email</label>
          <input id="contact-email" name="email" type="email" inputMode="email" required maxLength={254} autoComplete="email" placeholder="you@example.com" className={fieldClass} />
          <label className="sr-only" htmlFor="contact-message">Message</label>
          <textarea id="contact-message" name="message" required minLength={10} maxLength={2000} rows={5} placeholder="How can we help?" className={`${fieldClass} resize-y sm:col-span-2`} />
          <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
            <p className={`min-h-5 text-xs ${state === "error" ? "text-[#f1a38a]" : state === "success" ? "text-amber" : "text-dust"}`} aria-live="polite">
              {message}
            </p>
            <button type="submit" disabled={state === "sending"} className="min-h-12 shrink-0 rounded-full bg-amber px-7 text-sm font-semibold text-void transition-[background-color,transform,opacity] hover:scale-[1.02] hover:bg-cream disabled:cursor-wait disabled:opacity-65">
              {state === "sending" ? "Sending…" : "Send message"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
