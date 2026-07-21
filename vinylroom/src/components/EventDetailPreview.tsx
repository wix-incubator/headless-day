"use client";

import { motion } from "framer-motion";
import AlbumArt from "./AlbumArt";
import VinylLineup from "./VinylLineup";
import BookingPanel from "./BookingPanel";
import Waveform from "./Waveform";
import Reveal from "./Reveal";
import { featuredEvent, timeline, roomRules, type Room } from "@/data/rooms";

const moodTags = ["Warm", "Slow", "Intimate", "Candlelit", "Late night", "Analog"];

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[0.62rem] uppercase tracking-[0.18em] text-dust">{label}</div>
      <div className="mt-1 text-sm text-cream">{value}</div>
    </div>
  );
}

export default function EventDetailPreview({ event }: { event?: Room }) {
  const e = event ?? featuredEvent;

  return (
    <section id="event" className="relative z-10 mx-auto max-w-[100rem] px-5 py-24 sm:px-8 lg:py-32">
      <Reveal className="mb-12 flex items-center gap-4">
        <span className="eyebrow">Next room, in full</span>
        <span className="h-px flex-1 bg-edge" />
      </Reveal>

      {/* cinematic cover header */}
      <Reveal delay={0.05} className="relative overflow-hidden rounded-3xl border border-edge">
        <div
          className="relative flex min-h-[22rem] flex-col justify-end p-6 sm:p-10"
          style={{ background: `linear-gradient(150deg, ${e.sleeve.from}, ${e.sleeve.to})` }}
        >
          {/* darkening + grain seat */}
          <div className="absolute inset-0 bg-[radial-gradient(120%_100%_at_50%_0%,transparent_30%,rgba(8,7,6,0.8))]" />
          <div className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full opacity-30 blur-2xl" style={{ background: e.sleeve.accent }} />

          <div className="relative">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full bg-void/50 px-2.5 py-1 backdrop-blur-sm">
                <Waveform bars={3} className="h-2.5 w-3" color={e.sleeve.accent} />
                <span className="text-[0.6rem] uppercase tracking-[0.16em] text-cream/80">Now spinning · {e.nowSpinning}</span>
              </span>
              <span className="rounded-full border border-cream/20 px-2.5 py-1 text-[0.6rem] uppercase tracking-[0.16em] text-cream/80">
                {e.genre}
              </span>
            </div>
            <h2 className="mt-4 max-w-2xl text-balance font-display text-[clamp(2.4rem,5.5vw,4.4rem)] leading-[0.95] text-cream">
              {e.title}
            </h2>
            <p className="mt-3 max-w-lg text-parchment">{e.blurb}</p>
          </div>
        </div>
      </Reveal>

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[1.55fr_1fr]">
        {/* left: details */}
        <div className="space-y-12">
          {/* meta grid */}
          <Reveal className="grid grid-cols-2 gap-6 border-b border-edge pb-8 sm:grid-cols-4">
            <Meta label="When" value={`${e.dateLabel ?? e.day} · ${e.time}`} />
            <Meta label="Where" value={e.city} />
            <Meta label="Room" value={e.venue} />
            <Meta label="Seats" value={`${e.seatsLeft} of ${e.capacity} left`} />
          </Reveal>

          {/* mood tags */}
          <Reveal>
            <span className="eyebrow">The mood</span>
            <div className="mt-4 flex flex-wrap gap-2">
              {moodTags.map((t) => (
                <span key={t} className="rounded-full border border-edge bg-charcoal/40 px-3.5 py-1.5 text-sm text-beige">
                  {t}
                </span>
              ))}
            </div>
          </Reveal>

          {/* vinyl lineup */}
          <Reveal>
            <VinylLineup records={e.records} accent={e.sleeve.accent} roomTitle={e.title} city={e.city} />
          </Reveal>

          {/* timeline */}
          <Reveal>
            <span className="eyebrow">Timeline of the night</span>
            <ol className="relative mt-5 border-l border-edge pl-6">
              {timeline.map((t, i) => (
                <motion.li
                  key={t.time}
                  initial={false}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07, duration: 0.5 }}
                  className="relative pb-7 last:pb-0"
                >
                  <span className="absolute -left-[1.65rem] top-1 flex h-3 w-3 items-center justify-center">
                    <span className="h-2 w-2 rounded-full bg-amber shadow-[0_0_8px_rgba(216,154,69,0.7)]" />
                  </span>
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono text-sm text-amber">{t.time}</span>
                    <span className="font-display text-lg text-cream">{t.label}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-parchment">{t.note}</p>
                </motion.li>
              ))}
            </ol>
          </Reveal>

          {/* equipment + rules */}
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
            <Reveal>
              <span className="eyebrow">The setup</span>
              <ul className="mt-4 space-y-3">
                {e.equipment.map((q) => (
                  <li key={q} className="flex items-center gap-3 text-sm text-parchment">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md border border-edge text-amber">◈</span>
                    {q}
                  </li>
                ))}
                <li className="flex items-center gap-3 text-sm text-parchment">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md border border-edge text-amber">◈</span>
                  Original pressings, played start to finish
                </li>
              </ul>
            </Reveal>
            <Reveal delay={0.1}>
              <span className="eyebrow">Room rules</span>
              <ul className="mt-4 space-y-3">
                {roomRules.map((r) => (
                  <li key={r} className="flex gap-3 text-sm text-parchment">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-beige" />
                    {r}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>

        {/* right: sticky booking */}
        <Reveal delay={0.15}>
          <BookingPanel room={e} />
        </Reveal>
      </div>

      {/* decorative floating sleeve */}
      <div className="pointer-events-none absolute right-8 top-40 hidden w-28 rotate-6 opacity-40 xl:block" style={{ animation: "drift 9s ease-in-out infinite" }}>
        <AlbumArt sleeve={{ from: "#2f6b52", to: "#0a1712", accent: "#8fd6a8", motif: "horizon" }} />
      </div>
    </section>
  );
}
