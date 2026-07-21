"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import Reveal from "./Reveal";
import { stats, testimonials } from "@/data/rooms";

/** Counts a numeric stat up when it scrolls into view. Non-numeric parts (+, zł) pass through. */
function CountUp({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const numeric = parseFloat(value.replace(/[^0-9.]/g, ""));
  const [display, setDisplay] = useState(() => (Number.isNaN(numeric) ? value : "0"));
  const decimals = value.includes(".") ? 1 : 0;
  const prefix = value.match(/^[^0-9]*/)?.[0] ?? "";
  const suffix = value.match(/[^0-9.]*$/)?.[0] ?? "";

  useEffect(() => {
    if (!inView || Number.isNaN(numeric)) return;
    let raf = 0;
    const duration = 1400;
    let start: number | null = null;
    const step = (ts: number) => {
      if (start === null) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay((numeric * eased).toFixed(decimals));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [inView, numeric, decimals, value]);

  return (
    <span ref={ref}>
      {prefix}
      {Number.isNaN(numeric) ? "" : Number(display).toLocaleString(undefined, { minimumFractionDigits: decimals })}
      {suffix}
    </span>
  );
}

export default function Community() {
  return (
    <section id="community" className="relative z-10 mx-auto max-w-[100rem] px-5 py-24 sm:px-8 lg:py-32">
      <div className="grid grid-cols-1 gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        {/* manifesto + stats */}
        <div>
          <Reveal>
            <span className="eyebrow">Why it&apos;s different</span>
            <h2 className="mt-4 text-balance font-display text-[clamp(2.2rem,5vw,3.8rem)] leading-[0.98] text-cream">
              No algorithms. No background noise. <span className="italic text-beige">Just records and people who care.</span>
            </h2>
            <p className="mt-5 max-w-md text-parchment">
              Small rooms, real hosts, intentional listening. Every event is built
              around a real vinyl lineup — never a queue, never a shuffle.
            </p>
          </Reveal>

          <Reveal delay={0.1} className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-edge bg-edge">
            {stats.map((s) => (
              <div key={s.label} className="bg-pitch/60 p-6">
                <div className="font-display text-[clamp(2rem,4vw,3rem)] leading-none text-cream">
                  <CountUp value={s.value} />
                </div>
                <div className="mt-2 text-[0.7rem] uppercase tracking-[0.16em] text-dust">{s.label}</div>
              </div>
            ))}
          </Reveal>
        </div>

        {/* testimonials */}
        <div className="flex flex-col gap-5">
          {testimonials.map((t, i) => (
            <motion.blockquote
              key={t.name}
              initial={false}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.7, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className={`relative rounded-3xl border border-edge bg-gradient-to-b from-charcoal/50 to-transparent p-7 ${
                i === 1 ? "lg:ml-10" : i === 2 ? "lg:ml-4" : ""
              }`}
            >
              <span className="absolute right-6 top-4 font-display text-6xl leading-none text-cream/[0.06]" aria-hidden>
                &rdquo;
              </span>
              <p className="font-display text-xl leading-snug text-cream sm:text-2xl">{t.quote}</p>
              <footer className="mt-5 flex items-center gap-3">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold text-void"
                  style={{ background: `linear-gradient(135deg, ${t.accent}, ${t.accent}88)` }}
                >
                  {t.initials}
                </span>
                <span>
                  <span className="block text-sm text-cream">{t.name}</span>
                  <span className="block text-xs text-dust">{t.role}</span>
                </span>
              </footer>
            </motion.blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
