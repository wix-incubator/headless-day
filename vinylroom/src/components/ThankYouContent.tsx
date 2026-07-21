"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import SpotlightBackground from "@/components/SpotlightBackground";
import NoiseOverlay from "@/components/NoiseOverlay";
import AlbumArt from "@/components/AlbumArt";
import MemberBookingNote from "@/components/MemberBookingNote";
import ScratchableVinyl from "@/components/ScratchableVinyl";
import { rooms as demoRooms } from "@/data/rooms";

const nextSteps = [
  { label: "Check your inbox", note: "Your ticket and the room address are on the way." },
  { label: "Add it to your calendar", note: "Arrive within 15 minutes of doors — late entry breaks the spell." },
  { label: "Bring one record", note: "Something you'd love the room to hear between sides." },
];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
const dayIndex: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function nextRoomDate(room: (typeof demoRooms)[number]) {
  if (room.startDate) return new Date(room.startDate);
  const now = new Date();
  const date = new Date(now);
  const target = dayIndex[room.day] ?? now.getDay();
  const add = (target - now.getDay() + 7) % 7 || 7;
  date.setDate(now.getDate() + add);
  const [hours = "20", minutes = "00"] = room.time.split(":");
  date.setHours(Number(hours), Number(minutes), 0, 0);
  return date;
}

function calendarHref(room: (typeof demoRooms)[number], orderRef: string) {
  const starts = nextRoomDate(room);
  const ends = new Date(starts.getTime() + 2 * 60 * 60 * 1000);
  const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Vinyl Rooms//Listening Session//EN",
    "BEGIN:VEVENT",
    `UID:${orderRef || room.id}@vinylroom.online`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(starts)}`,
    `DTEND:${stamp(ends)}`,
    `SUMMARY:${room.title}`,
    `LOCATION:${room.venue}, ${room.city}`,
    `DESCRIPTION:Bring one record. Phones away once the needle drops.`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(body)}`;
}

export default function ThankYouContent() {
  const [query, setQuery] = useState<URLSearchParams | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setQuery(new URLSearchParams(window.location.search));
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  const event = query?.get("event") ?? "";
  const orderRef =
    query?.get("orderNumber") ||
    query?.get("orderId") ||
    query?.get("reservationId") ||
    query?.get("ticketOrderId") ||
    "";

  // Wix appends an order/reservation identifier on a completed checkout. If
  // it's missing, the visitor likely bounced off checkout (declined card,
  // "unavailable" error, or just navigated back) — don't claim their seat is
  // saved when we have no evidence it is.
  const confirmed = !!(
    orderRef
  );

  // Resolve the booked room from the baked catalogue by id, slug, or title.
  const room = useMemo(
    () =>
      demoRooms.find((r) => r.id === event || r.wixEventSlug === event) ??
      demoRooms.find((r) => norm(r.title) === norm(event) || norm(event).includes(r.id.replace(/-/g, ""))) ??
      demoRooms[0],
    [event],
  );
  const addToCalendarHref = useMemo(() => calendarHref(room, orderRef), [room, orderRef]);
  const ticketNumber = (orderRef || `${room.id}-preview`).slice(0, 12).toUpperCase();
  const seatLabel = confirmed ? `A-${String((ticketNumber.charCodeAt(0) % 12) + 1).padStart(2, "0")}` : "pending";

  return (
    <>
      <SpotlightBackground />
      <NoiseOverlay />

      <main className="relative z-10 flex min-h-[100svh] flex-col items-center justify-center px-5 py-20 text-center">
        <ScratchableVinyl accent={room.sleeve.accent} autoSpin={confirmed} label={room.genre} />

        {confirmed ? (
          <>
            <span className="eyebrow">Your seat is saved</span>
            <h1 className="mt-4 max-w-[21rem] text-balance font-display text-[clamp(2.05rem,10vw,2.55rem)] leading-[1] text-cream sm:max-w-2xl sm:text-[clamp(2.4rem,6vw,4.2rem)] sm:leading-[0.98]">
              A chair is waiting for you in the dark.
            </h1>
            <p className="mt-5 max-w-md text-lg text-parchment">
              You&apos;re on the list for{" "}
              <span className="text-cream">{room.title}</span> — {room.dateLabel ?? room.day} · {room.time}, {room.city}.
            </p>
          </>
        ) : (
          <>
            <span className="eyebrow text-amber">Checkout wasn&apos;t confirmed</span>
            <h1 className="mt-4 max-w-[21rem] text-balance font-display text-[clamp(2rem,9.5vw,2.45rem)] leading-[1] text-cream sm:max-w-2xl sm:text-[clamp(2.2rem,5.5vw,3.8rem)] sm:leading-[0.98]">
              We didn&apos;t hear back from checkout.
            </h1>
            <p className="mt-5 max-w-md text-lg text-parchment">
              If you already paid, check your email for a confirmation — otherwise, your seat for{" "}
              <span className="text-cream">{room.title}</span> hasn&apos;t been reserved yet.
            </p>
          </>
        )}

        <MemberBookingNote />

        {/* collectible ticket sleeve */}
        <div className="relative mt-10 w-full max-w-3xl overflow-hidden rounded-[1.75rem] border border-edge bg-gradient-to-br from-[#2b1a12] via-pitch to-void p-4 text-left glow-warm sm:p-5">
          <div className="pointer-events-none absolute -right-20 top-8 h-64 w-64 rounded-full grooves opacity-35" />
          <div className="pointer-events-none absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-amber/45 to-transparent" />
          <div className="pointer-events-none absolute inset-y-5 left-[58%] hidden w-px bg-[repeating-linear-gradient(to_bottom,var(--color-edge-strong)_0_8px,transparent_8px_16px)] sm:block" />
          <div className="relative grid gap-5 sm:grid-cols-[minmax(0,1fr)_15rem] sm:items-stretch">
            <div className="grid gap-4 sm:grid-cols-[12rem_minmax(0,1fr)]">
              <div className="relative min-h-48 overflow-hidden rounded-2xl border border-edge bg-void/35 p-3">
                <div className="absolute right-[-34%] top-[20%] h-44 w-44 rounded-full grooves opacity-95 ring-1 ring-edge" />
                <div className="relative h-36 w-36 overflow-hidden rounded-xl shadow-[0_24px_60px_-28px_rgba(0,0,0,0.95)]">
                  <AlbumArt sleeve={room.sleeve} label={room.title} sub={room.genre} />
                </div>
                <div className="absolute bottom-3 left-3 right-3 rounded-xl border border-edge bg-pitch/75 px-3 py-2">
                  <div className="text-[0.54rem] uppercase tracking-[0.22em] text-amber">
                    numbered inner sleeve
                  </div>
                  <div className="mt-1 font-mono text-xs text-cream">
                    #{ticketNumber}
                  </div>
                </div>
              </div>
              <div className="flex min-w-0 flex-col justify-between rounded-2xl border border-edge bg-void/25 p-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-edge bg-void/40 px-2.5 py-1 text-[0.56rem] uppercase tracking-[0.18em] text-amber">
                      {confirmed ? "Digital ticket" : "Room preview"}
                    </span>
                    <span className="rounded-full border border-edge bg-void/40 px-2.5 py-1 text-[0.56rem] uppercase tracking-[0.14em] text-dust">
                      Seat {seatLabel}
                    </span>
                  </div>
                  <div className="mt-4 font-display text-[clamp(1.65rem,6vw,2.5rem)] leading-[0.95] text-cream">
                    {room.title}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="block text-[0.58rem] uppercase tracking-[0.16em] text-dust">Host</span>
                      <span className="text-parchment">{room.host}</span>
                    </div>
                    <div>
                      <span className="block text-[0.58rem] uppercase tracking-[0.16em] text-dust">Doors</span>
                      <span className="text-parchment">{room.dateLabel ?? room.day} · {room.time}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="block text-[0.58rem] uppercase tracking-[0.16em] text-dust">Room</span>
                      <span className="text-parchment">{room.venue}, {room.city}</span>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-dust">
                    {room.records.slice(0, 3).map((record) => (
                      <span key={record} className="rounded-full border border-edge bg-void/30 px-2.5 py-1">
                        {record}
                      </span>
                    ))}
                  </div>
                </div>
                <a
                  href={addToCalendarHref}
                  download={`${room.id}-vinyl-room.ics`}
                  className={`mt-5 inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-medium transition-transform clickable sm:w-auto ${
                    confirmed ? "bg-cream text-void hover:scale-[1.02]" : "pointer-events-none border border-edge text-dust"
                  }`}
                >
                  Add to calendar
                </a>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-edge bg-cream/[0.04] p-4">
              <div className="absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-void" />
              <div className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-void" />
              <div className="text-[0.54rem] uppercase tracking-[0.24em] text-amber">Entry stub</div>
              <div className="mt-4 space-y-3 text-sm">
                <div>
                  <span className="block text-[0.56rem] uppercase tracking-[0.18em] text-dust">Order</span>
                  <span className="font-mono text-cream">{ticketNumber}</span>
                </div>
                <div>
                  <span className="block text-[0.56rem] uppercase tracking-[0.18em] text-dust">Seat</span>
                  <span className="font-display text-2xl text-cream">{seatLabel}</span>
                </div>
                <div>
                  <span className="block text-[0.56rem] uppercase tracking-[0.18em] text-dust">Status</span>
                  <span className={confirmed ? "text-amber" : "text-dust"}>{confirmed ? "Confirmed" : "Not confirmed"}</span>
                </div>
              </div>
              <div className="mt-6 flex h-14 items-end gap-1 border-t border-edge pt-4" aria-hidden="true">
                {Array.from({ length: 18 }).map((_, i) => (
                  <span
                    key={i}
                    className="w-1 bg-cream/75"
                    style={{ height: `${14 + ((ticketNumber.charCodeAt(i % ticketNumber.length) + i) % 30)}px` }}
                  />
                ))}
              </div>
              <p className="mt-4 text-xs leading-relaxed text-dust">
                Show this confirmation at the door. Bring curiosity, one record if you like, and keep phones away once the needle drops.
              </p>
            </div>
          </div>
        </div>

        {/* next steps */}
        <ol className={`mt-10 grid w-full max-w-2xl grid-cols-1 gap-4 text-left sm:grid-cols-3 ${confirmed ? "" : "opacity-40"}`}>
          {nextSteps.map((s, i) => (
            <li key={s.label} className="rounded-2xl border border-edge bg-pitch/40 p-4">
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-edge-strong text-xs text-amber">
                {i + 1}
              </span>
              <div className="mt-3 font-display text-lg leading-tight text-cream">{s.label}</div>
              <p className="mt-1 text-sm text-parchment">{s.note}</p>
            </li>
          ))}
        </ol>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/#rooms"
            className="rounded-full px-7 py-3.5 text-sm font-medium text-void clickable"
            style={{ background: "linear-gradient(135deg,#e8b45f,#b45f2a)", boxShadow: "0 16px 40px -14px rgba(216,154,69,0.6)" }}
          >
            Explore more rooms
          </Link>
          <Link
            href="/"
            className="rounded-full border border-edge-strong px-7 py-3.5 text-sm text-cream transition-colors hover:border-amber/50 clickable"
          >
            Back home
          </Link>
        </div>
      </main>
    </>
  );
}
