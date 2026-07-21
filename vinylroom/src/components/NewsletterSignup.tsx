"use client";

import { FormEvent, useState } from "react";

const NEWSLETTER_API = `${process.env.NEXT_PUBLIC_WIX_APP_API_URL ?? "https://tsksxe-881f90aac2a74e41-irakliyt.wix-host.com"}/api/newsletter`;

export default function NewsletterSignup({ compact = false }: { compact?: boolean }) {
  const [state, setState] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function subscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "sending") return;

    const form = event.currentTarget;
    const email = String(new FormData(form).get("email") ?? "").trim();
    setState("sending");
    setMessage("");

    try {
      const response = await fetch(NEWSLETTER_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error || "Could not subscribe right now.");
      form.reset();
      setState("success");
      setMessage(result.message || "You’re on the list.");
    } catch (error) {
      setState("error");
      const raw = error instanceof Error ? error.message : "";
      setMessage(raw && raw !== "Not found." ? raw : "Subscriptions are temporarily unavailable. Please try again shortly.");
    }
  }

  return (
    <section className={`newsletter-panel relative overflow-hidden rounded-[1.75rem] border border-amber/20 ${compact ? "p-5 sm:p-7" : "p-6 sm:p-9 lg:p-11"}`}>
      <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full border border-amber/15 grooves opacity-70" />
      <div className={`relative grid items-end gap-6 ${compact ? "lg:grid-cols-[1fr_1.15fr]" : "lg:grid-cols-[1fr_1.1fr] lg:gap-12"}`}>
        <div>
          <span className="eyebrow text-amber">The next pressing</span>
          <h2 className={`mt-3 font-display text-cream ${compact ? "text-3xl sm:text-4xl" : "text-4xl sm:text-5xl"}`}>
            Hear about the next room.
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-parchment">
            New listening sessions, host notes, and carefully chosen records. No noise between drops.
          </p>
        </div>

        <form onSubmit={subscribe} className="min-w-0" noValidate>
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="sr-only" htmlFor={`newsletter-email-${compact ? "compact" : "footer"}`}>Email address</label>
            <input
              id={`newsletter-email-${compact ? "compact" : "footer"}`}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              maxLength={254}
              placeholder="you@example.com"
              className="min-h-12 min-w-0 flex-1 rounded-full border border-edge-strong bg-void/65 px-5 text-sm text-cream outline-none transition-[border-color,box-shadow] placeholder:text-dust/70 focus:border-amber/70 focus:shadow-[0_0_0_4px_rgba(226,165,82,0.1)]"
            />
            <button
              type="submit"
              disabled={state === "sending"}
              className="min-h-12 shrink-0 rounded-full bg-amber px-7 text-sm font-semibold text-void transition-[background-color,transform,opacity] hover:scale-[1.02] hover:bg-cream disabled:cursor-wait disabled:opacity-65"
            >
              {state === "sending" ? "Subscribing…" : "Subscribe"}
            </button>
          </div>
          <p className={`mt-3 min-h-5 text-xs ${state === "error" ? "text-[#f1a38a]" : state === "success" ? "text-amber" : "text-dust"}`} aria-live="polite">
            {message || "Email only. Unsubscribe whenever you like."}
          </p>
        </form>
      </div>
    </section>
  );
}
