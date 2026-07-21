"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from "framer-motion";
import AlbumArt from "./AlbumArt";
import VinylDisc from "./VinylDisc";
import { useBooking } from "./booking/BookingProvider";
import { type Room } from "@/data/rooms";

function Heart({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6">
      <path d="M12 21s-7.5-4.6-10-9.2C.4 8.4 2 5 5.3 5 7.3 5 8.8 6.2 12 9c3.2-2.8 4.7-4 6.7-4C22 5 23.6 8.4 22 11.8 19.5 16.4 12 21 12 21z" />
    </svg>
  );
}

function countdownLabel(startDate: string, now: number) {
  const remaining = new Date(startDate).getTime() - now;
  if (!Number.isFinite(remaining) || remaining <= 0) return "Starting soon";
  const minutes = Math.floor(remaining / 60_000);
  const days = Math.floor(minutes / 1_440);
  const hours = Math.floor((minutes % 1_440) / 60);
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes % 60}m left`;
  return `${Math.max(1, minutes)}m left`;
}

function EventCountdown({ startDate }: { startDate?: string }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (!startDate) return;
    const update = () => setNow(Date.now());
    const frame = requestAnimationFrame(update);
    const timer = window.setInterval(update, 60_000);
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(timer);
    };
  }, [startDate]);

  if (!startDate || now === null) return null;
  return (
    <time
      dateTime={startDate}
      className="ml-auto shrink-0 rounded-full border border-amber/30 bg-amber/[0.08] px-2 py-0.5 font-mono text-[0.58rem] uppercase tracking-[0.12em] text-amber"
    >
      {countdownLabel(startDate, now)}
    </time>
  );
}

export default function RoomCard({ room, index = 0 }: { room: Room; index?: number }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const rect = useRef<DOMRect | null>(null);
  const [saved, setSaved] = useState(false);
  const [handling, setHandling] = useState(false);
  const { open } = useBooking();

  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rx = useSpring(useTransform(my, [0, 1], [6, -6]), { stiffness: 150, damping: 18 });
  const ry = useSpring(useTransform(mx, [0, 1], [-8, 8]), { stiffness: 150, damping: 18 });

  const onMove = (e: React.MouseEvent) => {
    if (reduce || !rect.current) return;
    const r = rect.current;
    mx.set((e.clientX - r.left) / r.width);
    my.set((e.clientY - r.top) / r.height);
  };
  const onEnter = () => {
    rect.current = ref.current?.getBoundingClientRect() ?? null;
  };
  const onLeave = () => {
    rect.current = null;
    mx.set(0.5);
    my.set(0.5);
  };

  const seatPct = Math.round((room.seatsLeft / room.capacity) * 100);
  const scarce = room.seatsLeft <= 3;
  const leadRecord = room.records[0] ?? room.title;
  const nextRecord = room.records[1] ?? room.genre;
  const statusLabel = index === 0 && room.nowSpinning ? "Now spinning" : scarce ? "Few seats left" : "Up next";

  return (
    <motion.article
      ref={ref}
      onMouseEnter={onEnter}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      initial={false}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7, delay: (index % 3) * 0.08, ease: [0.16, 1, 0.3, 1] }}
      style={{
        rotateX: rx,
        rotateY: ry,
        transformStyle: "preserve-3d",
      }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-edge bg-gradient-to-b from-charcoal/60 to-pitch/80 p-4 transition-[border-color,box-shadow] duration-500 hover:border-amber/25 [perspective:1000px]"
    >
      {/* hover glow */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100" style={{ boxShadow: "inset 0 0 60px rgba(216,154,69,0.08), 0 40px 80px -40px rgba(180,95,42,0.5)" }} />
      <span className="pointer-events-none absolute left-4 top-12 z-20 rounded-full border border-amber/35 bg-void/70 px-2 py-1 font-mono text-[0.5rem] uppercase tracking-[0.16em] text-amber opacity-0 transition-opacity duration-500 group-hover:opacity-100">
        VR-{String(index + 1).padStart(2, "0")}
      </span>
      <span className="pointer-events-none absolute right-14 top-3 z-20 rounded-full border border-edge bg-void/60 px-2 py-1 text-[0.52rem] uppercase tracking-[0.16em] text-beige opacity-0 transition-opacity duration-500 group-hover:opacity-100">
        Sleeve pull
      </span>

      {/* artwork stage */}
      <div
        className="relative [transform:translateZ(40px)]"
        onPointerEnter={() => setHandling(true)}
        onPointerLeave={() => setHandling(false)}
        onFocusCapture={() => setHandling(true)}
        onBlurCapture={() => setHandling(false)}
        style={{ transformStyle: "preserve-3d" }}
      >
        <div className="relative aspect-square">
          {/* vinyl slides out on hover as a sleeve detail, not a playback control */}
          <motion.div
            layoutId={`room-vinyl-${room.id}`}
            className="absolute right-0 top-0 aspect-square w-full"
            animate={
              reduce
                ? false
                : {
                    x: handling ? "28%" : "0%",
                    rotate: handling ? 8 : 0,
                    scale: handling ? 1.02 : 1,
                  }
            }
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          >
            <VinylDisc label={room.genre} accent={room.sleeve.accent} spinning={handling && !reduce} className="w-full" />
            <motion.span
              aria-hidden="true"
              className="pointer-events-none absolute inset-[8%] rounded-full border opacity-0"
              animate={reduce ? false : { opacity: handling ? 0.9 : 0 }}
              transition={{ duration: 0.35 }}
              style={{ borderColor: room.sleeve.accent, boxShadow: `0 0 34px -12px ${room.sleeve.accent}` }}
            />
          </motion.div>
          {/* sleeve */}
          <motion.div
            layoutId={`room-sleeve-${room.id}`}
            className="absolute inset-0 overflow-hidden rounded-[inherit]"
            animate={
              reduce
                ? false
                : {
                    x: handling ? "-5%" : "0%",
                    rotate: handling ? -1.5 : 0,
                    scale: handling ? 0.985 : 1,
                  }
            }
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          >
            <AlbumArt sleeve={room.sleeve} className="shadow-[0_20px_50px_-20px_rgba(0,0,0,0.8)]" />
            <span className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 sleeve-sheen" />
          </motion.div>

          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-3 left-3 right-3 z-10 overflow-hidden rounded-xl border border-cream/10 bg-void/55 px-3 py-2 text-left shadow-[0_18px_40px_-28px_rgba(0,0,0,0.9)] backdrop-blur-md"
            initial={false}
            animate={
              reduce
                ? { opacity: 1 }
                : {
                    opacity: handling ? 1 : 0,
                    y: handling ? 0 : 10,
                  }
            }
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: room.sleeve.accent }} />
                <span className="truncate text-[0.56rem] uppercase tracking-[0.18em] text-amber">Tonight</span>
              </div>
              <span className="shrink-0 text-[0.58rem] uppercase tracking-[0.12em] text-cream/70">
                {room.dateLabel ?? room.day} · {room.time}
              </span>
            </div>
            <div className="mt-1 truncate font-display text-base leading-none text-cream">{leadRecord}</div>
            <div className="mt-1 flex items-center justify-between gap-3 text-[0.68rem] text-parchment">
              <span className="min-w-0 truncate">Next: {nextRecord}</span>
              <span className="shrink-0 text-amber">{room.seatsLeft} seats</span>
            </div>
          </motion.div>

          {room.nowSpinning && (
            <div className="absolute left-2 top-2 z-10 flex max-w-[calc(100%-1rem)] items-center gap-1.5 rounded-full bg-void/70 px-2.5 py-1 backdrop-blur-sm">
              <span className="h-2 w-2 shrink-0 rounded-full ring-2 ring-cream/15" style={{ background: room.sleeve.accent }} />
              <span className="truncate text-[0.6rem] uppercase tracking-[0.16em] text-cream/80">
                {statusLabel}
              </span>
            </div>
          )}

          {/* save button */}
          <button
            type="button"
            aria-label={saved ? "Saved" : "Save event"}
            aria-pressed={saved}
            onClick={() => setSaved((v) => !v)}
            className={`absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-edge bg-void/60 backdrop-blur-sm transition-all duration-300 clickable ${
              saved ? "text-burnt" : "text-cream/70 hover:text-cream"
            }`}
          >
            <Heart filled={saved} />
          </button>
        </div>
      </div>

      {/* meta */}
      <div className="relative mt-4 flex flex-1 flex-col [transform:translateZ(24px)]">
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-edge px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.16em] text-beige">
            {room.genre}
          </span>
          <span className="min-w-0 flex-1 truncate text-[0.68rem] text-dust">{room.mood}</span>
          <EventCountdown startDate={room.startDate} />
        </div>

        <h3 className="mt-2 font-display text-2xl leading-tight text-cream">{room.title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-parchment">{room.blurb}</p>

        {/* vinyl lineup preview */}
        <div className="mt-3 flex items-center gap-1.5">
          {room.records.slice(0, 3).map((r) => (
            <span key={r} className="h-5 w-5 rounded-full grooves ring-1 ring-edge" title={r} />
          ))}
          <span className="ml-1 text-[0.68rem] text-dust">
            {room.records.length} records in the crate
          </span>
        </div>

        {/* host + location */}
        <div className="mt-4 flex items-center gap-2 text-xs text-parchment">
          <span
            className="flex h-6 w-6 items-center justify-center rounded-full text-[0.6rem] font-semibold text-void"
            style={{ background: `linear-gradient(135deg, ${room.sleeve.accent}, ${room.sleeve.from})` }}
          >
            {room.hostInitials}
          </span>
          <span className="text-cream/90">{room.host}</span>
          <span className="h-1 w-1 rounded-full bg-dust" />
          <span>{room.city}</span>
        </div>

        {/* seat availability bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-[0.7rem]">
            <span className={scarce ? "text-amber" : "text-parchment"}>
              {room.seatsLeft} of {room.capacity} seats left
            </span>
            <span className="text-dust">{room.dateLabel ?? room.day} · {room.time}</span>
          </div>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-edge">
            <motion.div
              initial={reduce ? false : { width: 0 }}
              whileInView={{ width: `${100 - seatPct}%` }}
              viewport={{ once: true }}
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
              className="h-full rounded-full"
              style={{ background: scarce ? "linear-gradient(90deg,#d89a45,#b45f2a)" : "linear-gradient(90deg,#bfae91,#c8a35a)" }}
            />
          </div>
        </div>

        {/* footer CTA */}
        <div className="mt-5 flex items-center justify-between border-t border-edge pt-4">
          <div>
            <div className="font-display text-xl text-cream">{room.price}</div>
            <div className="text-[0.62rem] uppercase tracking-[0.14em] text-dust">per seat</div>
          </div>
          <button
            type="button"
            onClick={() => open(room)}
            aria-label={`Reserve a seat for ${room.title}`}
            className="group/btn relative overflow-hidden rounded-full border border-edge-strong bg-void/40 px-4 py-2 text-sm text-cream transition-colors duration-300 hover:border-amber/50 clickable"
          >
            <span className="relative z-10">Reserve a seat</span>
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-amber/20 to-burnt/20 transition-transform duration-500 group-hover/btn:translate-x-0" />
          </button>
        </div>
      </div>
    </motion.article>
  );
}
