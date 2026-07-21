"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Reveal from "./Reveal";

const flows = {
  host: [
    { n: "01", title: "Choose the records", body: "Build a lineup from your crate — the deep cuts, the openers, the one you save for last." },
    { n: "02", title: "Set the mood", body: "Warm and slow, or loud and loose. Pick the room, the capacity, the price of a seat." },
    { n: "03", title: "Open your room", body: "Publish the night. A handful of seats appear. The right people start to find it." },
    { n: "04", title: "Welcome listeners", body: "Doors open, the needle drops, and your collection becomes a shared evening." },
  ],
  guest: [
    { n: "01", title: "Discover a night", body: "Browse intimate rooms near you by mood, genre, and the records being played." },
    { n: "02", title: "Preview the lineup", body: "See exactly what's spinning before you commit — every event lists its real vinyl." },
    { n: "03", title: "Book a seat", body: "Reserve one of a few spots. No crowds, no algorithm — just an evening held for you." },
    { n: "04", title: "Listen together", body: "Arrive, sit down, and hear an album the way it was meant to be heard. With people." },
  ],
};

export default function HowItWorks() {
  const [mode, setMode] = useState<"host" | "guest">("host");
  const steps = flows[mode];

  return (
    <section id="how" className="relative z-10 border-y border-edge bg-pitch/40">
      <div className="mx-auto max-w-[100rem] px-5 py-24 sm:px-8 lg:py-32">
        <Reveal className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-end">
          <div className="max-w-xl">
            <span className="eyebrow">How it works</span>
            <h2 className="mt-4 text-balance font-display text-[clamp(2.2rem,5vw,3.8rem)] leading-[0.98] text-cream">
              Not another playlist. <span className="italic text-beige">A shared ritual.</span>
            </h2>
          </div>

          {/* mode toggle */}
          <div className="relative flex rounded-full border border-edge bg-void/50 p-1">
            {(["host", "guest"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`relative z-10 rounded-full px-6 py-2.5 text-sm font-medium capitalize transition-colors duration-300 clickable ${
                  mode === m ? "text-void" : "text-parchment hover:text-cream"
                }`}
              >
                {mode === m && (
                  <motion.span
                    layoutId="modeToggle"
                    className="absolute inset-0 rounded-full bg-cream"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <span className="relative z-10">For {m}s</span>
              </button>
            ))}
          </div>
        </Reveal>

        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4"
          >
            {steps.map((s, i) => (
              <div
                key={s.n}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-edge bg-gradient-to-b from-charcoal/50 to-transparent p-6 transition-colors duration-500 hover:border-amber/25"
              >
                <div
                  className="absolute -right-4 -top-6 font-display text-[6rem] leading-none text-cream/[0.04] transition-colors duration-500 group-hover:text-amber/[0.08]"
                  aria-hidden
                >
                  {s.n}
                </div>
                {/* connector dot */}
                <div className="mb-6 flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-edge-strong text-xs font-semibold text-amber">
                    {i + 1}
                  </span>
                  {i < steps.length - 1 && (
                    <span className="hidden h-px flex-1 bg-gradient-to-r from-edge-strong to-transparent lg:block" />
                  )}
                </div>
                <h3 className="font-display text-2xl leading-tight text-cream">{s.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-parchment">{s.body}</p>
              </div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
