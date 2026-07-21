"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import RoomCard from "./RoomCard";
import Reveal from "./Reveal";
import { rooms as demoRooms, type Room } from "@/data/rooms";

const DIAL_MODES = [
  { id: "mood", label: "Mood", hint: "warm rooms" },
  { id: "city", label: "City", hint: "nearby nights" },
  { id: "tonight", label: "Tonight", hint: "soonest doors" },
  { id: "seats", label: "Seats left", hint: "last chairs" },
] as const;

type DialMode = (typeof DIAL_MODES)[number]["id"];

function modeFromPointer(e: React.PointerEvent<HTMLElement>) {
  const rect = e.currentTarget.getBoundingClientRect();
  const x = e.clientX - (rect.left + rect.width / 2);
  const y = e.clientY - (rect.top + rect.height / 2);
  const angle = (Math.atan2(y, x) * 180) / Math.PI + 90;
  const normalized = (angle + 360) % 360;
  return DIAL_MODES[Math.round(normalized / 90) % DIAL_MODES.length].id;
}

function roomScore(room: Room, mode: DialMode) {
  switch (mode) {
    case "mood":
      return room.mood.includes("Warm") || room.mood.includes("Intimate") ? 0 : 1;
    case "city":
      return ["Warsaw", "Paris", "Amsterdam"].includes(room.city) ? 0 : 1;
    case "tonight":
      return ["Fri", "Sat"].includes(room.day) ? 0 : 1;
    case "seats":
      return room.seatsLeft;
  }
}

function ListeningDial({
  mode,
  onChange,
}: {
  mode: DialMode;
  onChange: (mode: DialMode) => void;
}) {
  const dragging = useRef(false);
  const activeIndex = DIAL_MODES.findIndex((item) => item.id === mode);
  const rotation = activeIndex * 90;
  const updateFromPointer = (e: React.PointerEvent<HTMLButtonElement>) => {
    onChange(modeFromPointer(e));
  };

  return (
    <div className="relative rounded-3xl border border-edge bg-gradient-to-br from-charcoal/70 to-pitch/80 p-4 glow-warm">
      <div className="mb-4 flex items-center justify-between">
        <span className="eyebrow text-[0.58rem]">Find your night</span>
        <span className="font-mono text-[0.55rem] uppercase tracking-[0.12em] text-dust">
          tactile selector
        </span>
      </div>
      <div className="grid items-center gap-5 sm:grid-cols-[8.25rem_minmax(0,1fr)]">
        <button
          type="button"
          aria-label={`Drag to filter listening rooms, currently ${DIAL_MODES[activeIndex].label}`}
          onPointerDown={(e) => {
            dragging.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            updateFromPointer(e);
          }}
          onPointerMove={(e) => {
            if (!dragging.current) return;
            updateFromPointer(e);
          }}
          onPointerUp={(e) => {
            dragging.current = false;
            if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
          }}
          onPointerCancel={() => {
            dragging.current = false;
          }}
          className="relative mx-auto flex h-32 w-32 touch-none items-center justify-center rounded-full border border-edge bg-void/45 outline-none transition-colors focus-visible:border-amber/70 clickable"
        >
          <div className="absolute inset-3 rounded-full grooves opacity-75" />
          <motion.div
            className="absolute inset-0"
            animate={{ rotate: rotation }}
            transition={{ type: "spring", stiffness: 170, damping: 20 }}
          >
            <span className="absolute left-1/2 top-1.5 h-4 w-4 -translate-x-1/2 rounded-full bg-amber shadow-[0_0_24px_rgba(226,165,82,0.75)]" />
          </motion.div>
          <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full border border-amber/45 bg-pitch text-center font-display text-sm leading-none text-cream">
            {DIAL_MODES[activeIndex].label}
          </div>
          <span className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 text-[0.48rem] uppercase tracking-[0.16em] text-dust">
            drag
          </span>
          <div className="pointer-events-none absolute -bottom-3 left-1/2 flex -translate-x-1/2 gap-1">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="h-7 w-5 rounded-[3px] border border-edge bg-gradient-to-b from-amber/30 to-pitch shadow-[0_10px_18px_-14px_rgba(0,0,0,0.9)]"
                animate={{ y: activeIndex === i ? -3 : 0, rotate: (i - 1) * 5 + activeIndex }}
                transition={{ type: "spring", stiffness: 180, damping: 18 }}
              />
            ))}
          </div>
        </button>
        <div className="grid grid-cols-2 gap-2">
          {DIAL_MODES.map((item, index) => {
            const on = mode === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChange(item.id)}
                className={`rounded-2xl border px-3 py-2 text-left transition-all duration-300 clickable ${
                  on
                    ? "border-amber/65 bg-amber/15 text-cream"
                    : "border-edge bg-void/20 text-parchment hover:border-edge-strong hover:text-cream"
                }`}
              >
                <span className="block text-[0.56rem] uppercase tracking-[0.18em] text-amber">
                  0{index + 1}
                </span>
                <span className="mt-1 block text-sm font-medium">{item.label}</span>
                <span className="mt-0.5 block text-[0.68rem] text-dust">{item.hint}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function LiveSignalBoard({ rooms, source }: { rooms: Room[]; source: "wix" | "mock" }) {
  const signals = useMemo(
    () =>
      [...rooms]
        .sort((a, b) => a.seatsLeft - b.seatsLeft)
        .slice(0, 3)
        .map((room, index) => ({
          city: room.city,
          state: room.seatsLeft <= 0 ? "sold out" : room.seatsLeft <= 3 ? `${room.seatsLeft} seats` : `doors ${index === 0 ? "42m" : "soon"}`,
          tone: room.seatsLeft <= 3 ? "text-amber" : "text-parchment",
        })),
    [rooms],
  );

  return (
    <Reveal delay={0.16} className="rounded-3xl border border-edge bg-pitch/45 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="eyebrow text-[0.58rem]">Live room signal</span>
        <span className={`rounded-full border px-2 py-1 text-[0.54rem] uppercase tracking-[0.14em] ${source === "wix" ? "border-amber/40 text-amber" : "border-edge text-dust"}`}>
          {source === "wix" ? "Wix data" : "Preview"}
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
        {signals.map((signal, index) => (
          <motion.div
            key={`${signal.city}-${signal.state}`}
            initial={false}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: index * 0.08 }}
            className="relative overflow-hidden rounded-2xl border border-edge bg-void/25 px-3 py-2.5"
          >
            <div className="relative z-10 flex items-center justify-between gap-3">
              <span className="text-sm text-cream">{signal.city}</span>
              <span className={`text-[0.62rem] uppercase tracking-[0.16em] ${signal.tone}`}>
                {signal.state}
              </span>
            </div>
            <div className="pointer-events-none mt-2 flex h-4 items-end gap-1">
              {[0, 1, 2, 3, 4].map((bar) => (
                <span
                  key={bar}
                  className="signal-dot w-1 rounded-full bg-amber/55"
                  style={{
                    height: `${5 + ((bar + index) % 4) * 3}px`,
                    animationDelay: `${(bar + index) * 0.08}s`,
                  }}
                />
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </Reveal>
  );
}

export default function FeaturedRooms({
  rooms = demoRooms,
  source = "mock",
}: {
  rooms?: Room[];
  source?: "wix" | "mock";
}) {
  const [mode, setMode] = useState<DialMode>("mood");
  const [showAllMobile, setShowAllMobile] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [page, setPage] = useState(0);
  const [refreshedRooms, setRefreshedRooms] = useState<Room[] | null>(null);
  const displayedRooms = refreshedRooms ?? rooms;
  const displayedSource = refreshedRooms?.length ? "wix" : source;

  useEffect(() => {
    const media = window.matchMedia("(min-width: 640px)");
    const update = () => setIsDesktop(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    let alive = true;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    let idleId: number | undefined;

    const refresh = async (expectedEventId?: string) => {
      try {
        const { getLiveListeningRooms } = await import("@/lib/wix/liveRooms");
        for (let attempt = 0; attempt < (expectedEventId ? 3 : 1); attempt += 1) {
          const live = await getLiveListeningRooms();
          if (!alive) return;
          if (live.length) {
            setRefreshedRooms(live);
            window.dispatchEvent(new CustomEvent("vinylroom:rooms-refreshed", { detail: { count: live.length } }));
          }
          if (!expectedEventId || live.some((room) => room.wixEventId === expectedEventId)) return;
          await new Promise((resolve) => setTimeout(resolve, 1200));
        }
      } catch {
        // Keep the baked rooms. A live refresh is progressive enhancement only.
      }
    };

    const onCreated = (event: Event) => {
      const eventId = (event as CustomEvent<{ eventId?: string }>).detail?.eventId;
      refreshTimer = setTimeout(() => void refresh(eventId), 500);
    };
    window.addEventListener("vinylroom:event-created", onCreated);

    const startIdleRefresh = () => void refresh();
    if ("requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(startIdleRefresh, { timeout: 6000 });
    } else {
      refreshTimer = setTimeout(startIdleRefresh, 4000);
    }

    return () => {
      alive = false;
      window.removeEventListener("vinylroom:event-created", onCreated);
      if (refreshTimer) clearTimeout(refreshTimer);
      if (idleId !== undefined && "cancelIdleCallback" in window) window.cancelIdleCallback(idleId);
    };
  }, []);

  const sortedRooms = useMemo(
    () => [...displayedRooms].sort((a, b) => roomScore(a, mode) - roomScore(b, mode)),
    [displayedRooms, mode],
  );

  const pageSize = 6;
  const pageCount = Math.max(1, Math.ceil(sortedRooms.length / pageSize));
  const activePage = Math.min(page, pageCount - 1);
  const filtered = useMemo(
    () => {
      if (!isDesktop) return showAllMobile ? sortedRooms : sortedRooms.slice(0, 3);
      return sortedRooms.slice(activePage * pageSize, activePage * pageSize + pageSize);
    },
    [activePage, isDesktop, showAllMobile, sortedRooms],
  );
  const pageStart = activePage * pageSize + 1;
  const pageEnd = Math.min(sortedRooms.length, pageStart + filtered.length - 1);

  return (
    <section id="rooms" className="relative z-10 mx-auto max-w-[100rem] px-5 py-24 sm:px-8 lg:py-32">
      <Reveal className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-xl">
          <div className="flex items-center gap-3">
            <span className="eyebrow">Featured listening rooms</span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.58rem] uppercase tracking-[0.16em] ${
                displayedSource === "wix"
                  ? "border-amber/40 text-amber"
                  : "border-edge text-dust"
              }`}
              title={
                displayedSource === "wix"
                  ? "Rooms are loaded live from Wix Events"
                  : "Showing built-in demo data — connect Wix to go live"
              }
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${displayedSource === "wix" ? "animate-pulse bg-amber" : "bg-dust"}`}
              />
              {displayedSource === "wix" ? "Live from Wix" : "Demo data"}
            </span>
          </div>
          <h2 className="mt-4 text-balance font-display text-[clamp(2.2rem,5vw,3.8rem)] leading-[0.98] text-cream">
            Small rooms. Deep cuts. <span className="italic text-beige">Real conversation.</span>
          </h2>
          <p className="mt-4 max-w-md text-parchment">
            Every night is built around a real vinyl lineup and a handful of seats.
            Find the one that sounds like your kind of evening.
          </p>
        </div>
      </Reveal>

      <div className="mt-10 grid gap-4 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <Reveal delay={0.1}>
          <ListeningDial
            mode={mode}
            onChange={(nextMode) => {
              setMode(nextMode);
              setPage(0);
            }}
          />
        </Reveal>
        <LiveSignalBoard rooms={displayedRooms} source={displayedSource} />
      </div>

      {/* grid */}
      <motion.div layout className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {filtered.map((room, i) => (
            <motion.div
              key={room.id}
              layout
              initial={false}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <RoomCard room={room} index={isDesktop ? activePage * pageSize + i : i} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
      {!isDesktop && !showAllMobile && displayedRooms.length > 3 && (
        <div className="mt-7 flex justify-center sm:hidden">
          <button
            type="button"
            onClick={() => setShowAllMobile(true)}
            className="rounded-full border border-edge-strong px-5 py-3 text-sm text-cream clickable"
          >
            Show more rooms
          </button>
        </div>
      )}
      {isDesktop && pageCount > 1 && (
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <span className="rounded-full border border-edge bg-void/35 px-3 py-2 text-[0.68rem] uppercase tracking-[0.14em] text-dust">
            {pageStart}-{pageEnd} of {sortedRooms.length}
          </span>
          <div className="flex items-center gap-2 rounded-full border border-edge bg-void/35 p-1">
            {Array.from({ length: pageCount }, (_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Show room page ${i + 1}`}
                aria-current={activePage === i ? "page" : undefined}
                onClick={() => setPage(i)}
                className={`h-9 min-w-9 rounded-full px-3 text-sm transition-colors clickable ${
                  activePage === i
                    ? "bg-amber text-void"
                    : "text-parchment hover:bg-amber/10 hover:text-cream"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
