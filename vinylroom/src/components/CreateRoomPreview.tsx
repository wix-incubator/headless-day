"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import AlbumArt from "./AlbumArt";
import Waveform from "./Waveform";
import Reveal from "./Reveal";
import { usePlayer, type Track } from "./player/PlayerProvider";
import { artworkVariant } from "@/lib/artwork";
import { type Genre, type Sleeve } from "@/data/rooms";
import { useMember } from "@/components/member/MemberProvider";
import { getBrowserClient } from "@/lib/wix/browser";
import { createEventCoverPng } from "@/lib/eventCover";
import previewsData from "@/data/previews.json";

type Preview = { track: string; artist: string; previewUrl: string; artwork: string };
type CreatedEvent = {
  eventId: string;
  slug?: string;
  status: string;
  message: string;
  eventPageUrl?: string;
};

// Searchable album pool built from the real (iTunes-backed) catalogue.
const ALBUM_POOL = Object.entries(previewsData as Record<string, Preview>)
  .filter(([record]) => record !== "AC/DC — Thunderstruck")
  .map(([record, info]) => ({
    record,
    artist: info.artist,
    album: record.split(" — ").slice(1).join(" — "),
    artwork: info.artwork,
  }));

const GENRE_OPTS: { g: Genre; sleeve: Sleeve }[] = [
  { g: "Jazz", sleeve: { from: "#1b3a5c", to: "#0a1420", accent: "#7fa8e8", motif: "circle" } },
  { g: "Soul", sleeve: { from: "#7a1f2b", to: "#22070a", accent: "#e8a04a", motif: "split" } },
  { g: "Hip-Hop", sleeve: { from: "#c25a1e", to: "#2a1006", accent: "#f0a850", motif: "grid" } },
  { g: "Ambient", sleeve: { from: "#2f6b52", to: "#0a1712", accent: "#8fd6a8", motif: "horizon" } },
  { g: "City Pop", sleeve: { from: "#d4507e", to: "#2a0a1c", accent: "#ff9ec4", motif: "arc" } },
  { g: "Electronic", sleeve: { from: "#c22b3a", to: "#1a1a1c", accent: "#ff6b78", motif: "bars" } },
];

const MOODS = ["Warm", "Slow", "Intimate", "Loud", "Weightless", "Romantic", "Nocturnal"];
const HOST_EVENTS_API = `${process.env.NEXT_PUBLIC_WIX_APP_API_URL ?? "https://tsksxe-881f90aac2a74e41-irakliyt.wix-host.com"}/api/host-events`;
const STUDIO_STEPS = ["Record", "Mood", "Room", "Tickets"];

function defaultEventDate() {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  return date.toISOString().slice(0, 10);
}

function scheduleLabel(date: string, time: string) {
  if (!date) return "Set a date";
  return `${new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(`${date}T12:00:00`))} · ${time || "Set a time"}`;
}

export default function CreateRoomPreview() {
  const [title, setTitle] = useState("Late Night on the Blue Side");
  const [genreIdx, setGenreIdx] = useState(0);
  const [moods, setMoods] = useState<string[]>(["Warm", "Slow", "Intimate"]);
  const [eventDate, setEventDate] = useState(defaultEventDate);
  const [eventTime, setEventTime] = useState("20:00");
  const [venue, setVenue] = useState("A room in Warsaw");
  const [capacity, setCapacity] = useState(8);
  const [price, setPrice] = useState(18);
  const [isPrivate, setIsPrivate] = useState(false);
  const [query, setQuery] = useState("");
  const [showAllAlbums, setShowAllAlbums] = useState(false);
  const [records, setRecords] = useState<string[]>([
    "Miles Davis — Kind of Blue",
    "Bill Evans Trio — Waltz for Debby",
  ]);
  const [creating, setCreating] = useState(false);
  const [createMessage, setCreateMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [createdEvent, setCreatedEvent] = useState<CreatedEvent | null>(null);
  const player = usePlayer();
  const { member, loading: memberLoading, login } = useMember();

  const genre = GENRE_OPTS[genreIdx];

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = q ? ALBUM_POOL.filter((a) => a.record.toLowerCase().includes(q)) : ALBUM_POOL;
    // selected first, then the rest
    return [...pool].sort(
      (a, b) => Number(records.includes(b.record)) - Number(records.includes(a.record)),
    );
  }, [query, records]);
  const visibleResults = useMemo(() => {
    if (showAllAlbums || query.trim()) return results;
    return results.slice(0, 8);
  }, [query, results, showAllAlbums]);
  const art = (record: string) => ALBUM_POOL.find((a) => a.record === record)?.artwork;
  const firstPlayable = ALBUM_POOL.find((a) => records.includes(a.record));
  const previewIsThis = !!firstPlayable && player.current?.record === firstPlayable.record;
  const previewIsPlaying = previewIsThis && player.playing;

  const playCratePreview = () => {
    if (!firstPlayable) return;
    const t: Track = {
      record: firstPlayable.record,
      track: firstPlayable.record.split(" — ").slice(1).join(" — "),
      artist: firstPlayable.artist,
      previewUrl: (previewsData as Record<string, { previewUrl: string }>)[firstPlayable.record]?.previewUrl ?? "",
      artwork: firstPlayable.artwork,
      roomTitle: title || "Your night",
      accent: genre.sleeve.accent,
    };
    if (!t.previewUrl) return;
    player.toggle(t);
  };

  const toggleMood = (m: string) =>
    setMoods((p) => (p.includes(m) ? p.filter((x) => x !== m) : p.length < 3 ? [...p, m] : p));
  const toggleRecord = (r: string) =>
    setRecords((p) => (p.includes(r) ? p.filter((x) => x !== r) : [...p, r]));

  const moodLine = useMemo(() => moods.join(" · ") || "Set a mood", [moods]);
  const studioProgress = [
    records.length > 0,
    moods.length > 0,
    Boolean(venue.trim() && eventDate && eventTime),
    capacity > 0 && price >= 0,
  ];
  const createWixEvent = async () => {
    if (!title.trim() || !eventDate || !eventTime || !venue.trim() || records.length === 0) {
      setFormError("Add a title, date, time, location, and at least one record before creating the event.");
      return;
    }
    if (memberLoading) {
      setFormError("Checking your member session. Try again in a moment.");
      return;
    }
    if (!member) {
      setFormError("Sign in as a Vinyl Rooms member to create this event.");
      login("/#host");
      return;
    }

    const client = getBrowserClient();
    if (!client) {
      setFormError("Wix Headless is not configured for this site.");
      return;
    }

    setCreating(true);
    setCreatedEvent(null);
    setFormError("");
    try {
      setCreateMessage("Pressing your collectible event sleeve…");
      const coverDataUrl = await createEventCoverPng({
        title: title.trim(),
        genre: genre.g,
        moods,
        sleeve: genre.sleeve,
      });
      setCreateMessage("Creating the ticketed room in Wix Events…");
      const response = await client.fetchWithAuth(HOST_EVENTS_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          genre: genre.g,
          moods,
          date: eventDate,
          time: eventTime,
          venue: venue.trim(),
          capacity,
          price,
          isPrivate,
          records,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Warsaw",
          coverDataUrl,
        }),
      });
      const result = (await response.json().catch(() => ({}))) as CreatedEvent & { error?: string };
      if (response.status === 401) {
        login("/#host");
        throw new Error(result.error || "Your member session expired. Sign in and try again.");
      }
      if (!response.ok) throw new Error(result.error || "Wix could not create this event.");
      setCreatedEvent(result);
      setCreateMessage(result.message);
      window.dispatchEvent(new CustomEvent("vinylroom:event-created", { detail: result }));
    } catch (error) {
      setCreateMessage("");
      setFormError(error instanceof Error ? error.message : "Wix could not create this event.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <section id="host" className="relative z-10 border-y border-edge bg-pitch/40">
      <div className="mx-auto max-w-[100rem] px-5 py-24 sm:px-8 lg:py-32">
        <Reveal className="max-w-xl">
          <span className="eyebrow">Host mode</span>
          <h2 className="mt-4 text-balance font-display text-[clamp(2.2rem,5vw,3.8rem)] leading-[0.98] text-cream">
            Turn your collection <span className="italic text-beige">into an evening.</span>
          </h2>
          <p className="mt-4 text-parchment">
            Build the room the way you&apos;d build a mix. Everything you set appears,
            live, in the card your guests will see.
          </p>
        </Reveal>

        <Reveal delay={0.06} className="mt-8 grid gap-2 sm:grid-cols-4">
          {STUDIO_STEPS.map((step, index) => {
            const done = studioProgress[index];
            return (
              <div
                key={step}
                className={`rounded-2xl border px-4 py-3 transition-colors ${
                  done ? "border-amber/40 bg-amber/10" : "border-edge bg-pitch/35"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[0.58rem] uppercase tracking-[0.2em] text-dust">
                    0{index + 1}
                  </span>
                  <span className={`h-2 w-2 rounded-full ${done ? "bg-amber shadow-[0_0_12px_rgba(226,165,82,0.75)]" : "bg-edge-strong"}`} />
                </div>
                <div className="mt-2 font-display text-xl leading-none text-cream">{step}</div>
              </div>
            );
          })}
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          {/* ── Creator form ── */}
          <Reveal className="rounded-3xl border border-edge glass p-6 sm:p-8">
            {/* title */}
            <label className="block">
              <span className="eyebrow text-[0.62rem]">Event title</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Name your night"
                className="mt-2 w-full border-b border-edge-strong bg-transparent pb-2 font-display text-2xl text-cream outline-none transition-colors placeholder:text-dust focus:border-amber"
              />
            </label>

            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-[0.9fr_0.7fr_1.4fr]">
              <label className="block">
                <span className="eyebrow text-[0.62rem]">Date</span>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="mt-2 w-full border-b border-edge-strong bg-transparent pb-2 text-sm text-cream outline-none transition-colors focus:border-amber"
                />
              </label>
              <label className="block">
                <span className="eyebrow text-[0.62rem]">Doors</span>
                <input
                  type="time"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                  className="mt-2 w-full border-b border-edge-strong bg-transparent pb-2 text-sm text-cream outline-none transition-colors focus:border-amber"
                />
              </label>
              <label className="block">
                <span className="eyebrow text-[0.62rem]">Location</span>
                <input
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  placeholder="A room in Warsaw"
                  className="mt-2 w-full border-b border-edge-strong bg-transparent pb-2 text-sm text-cream outline-none transition-colors placeholder:text-dust focus:border-amber"
                />
              </label>
            </div>

            {/* genre pills */}
            <div className="mt-8">
              <span className="eyebrow text-[0.62rem]">Genre</span>
              <div className="mt-3 flex flex-wrap gap-2">
                {GENRE_OPTS.map((o, i) => (
                  <button
                    key={o.g}
                    type="button"
                    onClick={() => setGenreIdx(i)}
                    className={`relative rounded-full border px-4 py-2 text-sm transition-colors duration-300 clickable ${
                      genreIdx === i ? "border-transparent text-void" : "border-edge text-parchment hover:text-cream"
                    }`}
                  >
                    {genreIdx === i && (
                      <motion.span layoutId="genrePill" className="absolute inset-0 rounded-full" style={{ background: o.sleeve.accent }} transition={{ type: "spring", stiffness: 400, damping: 32 }} />
                    )}
                    <span className="relative z-10">{o.g}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* mood pills (max 3) */}
            <div className="mt-8">
              <div className="flex items-center justify-between">
                <span className="eyebrow text-[0.62rem]">Mood · pick up to 3</span>
                <span className="text-[0.62rem] text-dust">{moods.length}/3</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {MOODS.map((m) => {
                  const on = moods.includes(m);
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => toggleMood(m)}
                      className={`rounded-full border px-3.5 py-1.5 text-sm transition-all duration-300 clickable ${
                        on ? "border-amber/60 bg-amber/15 text-cream" : "border-edge text-parchment hover:text-cream"
                      }`}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* capacity + price sliders */}
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <div className="flex items-center justify-between">
                  <span className="eyebrow text-[0.62rem]">Capacity</span>
                  <span className="font-display text-xl text-cream">{capacity}</span>
                </div>
                <input
                  type="range"
                  aria-label="Room capacity"
                  min={2}
                  max={24}
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                  className="range mt-3 w-full"
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <span className="eyebrow text-[0.62rem]">Seat price</span>
                  <span className="font-display text-xl text-cream">${price}</span>
                </div>
                <input
                  type="range"
                  aria-label="Seat price"
                  min={0}
                  max={120}
                  step={5}
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="range mt-3 w-full"
                />
              </div>
            </div>

            {/* album search — real catalogue */}
            <div className="mt-8">
              <div className="flex items-center justify-between">
                <span className="eyebrow text-[0.62rem]">Add to the crate</span>
                <span className="text-[0.62rem] text-dust">{records.length} selected</span>
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-edge bg-void/40 px-3 py-2.5 focus-within:border-amber/60">
                <span className="text-beige">⌕</span>
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setShowAllAlbums(false);
                  }}
                  placeholder="Search albums — artist or title…"
                  className="w-full bg-transparent text-sm text-cream outline-none placeholder:text-dust"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setShowAllAlbums(false);
                    }}
                    aria-label="Clear"
                    className="text-dust hover:text-cream clickable"
                  >
                    ×
                  </button>
                )}
              </div>
              <div className="no-scrollbar mt-3 max-h-60 space-y-1.5 overflow-y-auto pr-1">
                {results.length === 0 && (
                  <div className="px-3 py-4 text-center text-xs text-dust">No albums match “{query}”.</div>
                )}
                {visibleResults.map((a) => {
                  const on = records.includes(a.record);
                  return (
                    <button
                      key={a.record}
                      type="button"
                      onClick={() => toggleRecord(a.record)}
                      className={`flex w-full items-center gap-3 rounded-lg border px-2.5 py-2 text-left transition-colors duration-200 clickable ${
                        on ? "border-amber/40 bg-amber/10" : "border-transparent hover:bg-charcoal/50"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={artworkVariant(a.artwork, 100)}
                        alt=""
                        width={36}
                        height={36}
                        loading="lazy"
                        decoding="async"
                        className="h-9 w-9 shrink-0 rounded ring-1 ring-edge"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-cream">{a.album}</span>
                        <span className="block truncate text-xs text-dust">{a.artist}</span>
                      </span>
                      <span className={`flex h-6 w-6 items-center justify-center rounded-full text-base leading-none ${on ? "bg-amber/20 text-amber" : "text-beige"}`}>{on ? "−" : "+"}</span>
                    </button>
                  );
                })}
                {!query.trim() && !showAllAlbums && results.length > visibleResults.length && (
                  <button
                    type="button"
                    onClick={() => setShowAllAlbums(true)}
                    className="w-full rounded-lg border border-edge px-3 py-2 text-center text-xs text-parchment transition-colors hover:border-edge-strong hover:text-cream clickable"
                  >
                    Show all {results.length} albums
                  </button>
                )}
              </div>
            </div>

            {/* private/public toggle */}
            <div className="mt-8 flex items-center justify-between rounded-2xl border border-edge bg-void/30 px-4 py-3.5">
              <div>
                <div className="text-sm text-cream">{isPrivate ? "Private room" : "Public room"}</div>
                <div className="text-xs text-dust">
                  {isPrivate ? "Invite-only — you share the link" : "Discoverable by anyone nearby"}
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-label="Make this room private"
                aria-checked={isPrivate}
                onClick={() => setIsPrivate((v) => !v)}
                className={`relative h-7 w-12 rounded-full transition-colors duration-300 clickable ${isPrivate ? "bg-burnt" : "bg-edge-strong"}`}
              >
                <motion.span
                  layout
                  transition={{ type: "spring", stiffness: 500, damping: 32 }}
                  className={`absolute top-1 h-5 w-5 rounded-full bg-cream ${isPrivate ? "left-6" : "left-1"}`}
                />
              </button>
            </div>
          </Reveal>

          {/* ── Live preview ── */}
          <Reveal delay={0.1} className="lg:sticky lg:top-24 lg:self-start">
            <div className="mb-3 flex items-center gap-2">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber" />
              <span className="text-[0.62rem] uppercase tracking-[0.22em] text-dust">Live preview</span>
            </div>
            <div className="overflow-hidden rounded-2xl border border-edge bg-gradient-to-b from-charcoal/60 to-pitch/80 p-4 glow-warm">
              <div className="relative pt-10 sm:pt-0">
                <div className="pointer-events-none absolute -right-[18%] top-[16%] z-0 h-[72%] w-[72%] rounded-full grooves opacity-55 ring-1 ring-edge" />
                <AnimatePresence mode="wait">
                  <motion.div
                    key={genreIdx}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.35 }}
                  >
                    <div className="relative z-10 w-[82%]">
                      <AlbumArt sleeve={genre.sleeve} label={title || "Your night"} sub={`${genre.g} · Warsaw`} />
                    </div>
                  </motion.div>
                </AnimatePresence>
                <span className={`absolute right-2 top-1 z-20 rounded-full px-2.5 py-1 text-[0.6rem] uppercase tracking-[0.16em] backdrop-blur-sm sm:top-2 ${isPrivate ? "bg-burnt/80 text-cream" : "bg-void/70 text-cream/80"}`}>
                  {isPrivate ? "Private" : "Public"}
                </span>
                <div className="absolute bottom-3 right-3 z-20 rounded-xl border border-edge bg-void/75 px-3 py-2">
                  <div className="text-[0.52rem] uppercase tracking-[0.18em] text-amber">Guest view</div>
                  <div className="mt-0.5 text-xs text-parchment">Live sleeve builds here</div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-amber/20 bg-void/35 p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="text-[0.56rem] uppercase tracking-[0.22em] text-amber">
                    Collectible ticket sleeve
                  </span>
                  <span className="font-mono text-[0.56rem] text-dust">
                    #{String(capacity).padStart(2, "0")}/{price || 0}
                  </span>
                </div>
                <div className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-3">
                  <div className="relative aspect-square overflow-hidden rounded-lg border border-edge bg-pitch">
                    <div className="absolute inset-0 grooves opacity-60" />
                    <div className="absolute inset-[28%] rounded-full border border-amber/35" />
                    <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-display text-lg leading-tight text-cream">
                      {title || "Your night"}
                    </div>
                    <div className="mt-1 truncate text-xs text-parchment">
                      {scheduleLabel(eventDate, eventTime)} · {venue || "Set a location"}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {moods.slice(0, 3).map((mood) => (
                        <span key={mood} className="rounded-full border border-edge px-2 py-0.5 text-[0.58rem] text-dust">
                          {mood}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-edge px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.16em]" style={{ color: genre.sleeve.accent }}>
                    {genre.g}
                  </span>
                  <span className="truncate text-[0.68rem] text-dust">{moodLine}</span>
                </div>
                <h3 className="mt-2 line-clamp-2 font-display text-2xl leading-tight text-cream">
                  {title || "Your night"}
                </h3>

                <p className="mt-2 text-[0.72rem] text-dust">{scheduleLabel(eventDate, eventTime)} · {venue || "Set a location"}</p>

                <div className="mt-3 flex items-center gap-1.5">
                  {records.length ? (
                    records.slice(0, 5).map((r) => {
                      const a = art(r);
                      return a ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={r}
                          src={artworkVariant(a, 100)}
                          alt=""
                          width={24}
                          height={24}
                          loading="lazy"
                          decoding="async"
                          className="h-6 w-6 rounded ring-1 ring-edge"
                        />
                      ) : (
                        <span key={r} className="h-6 w-6 rounded-full grooves ring-1 ring-edge" />
                      );
                    })
                  ) : (
                    <span className="text-[0.68rem] text-dust">Add records to the crate →</span>
                  )}
                  {records.length > 0 && <span className="ml-1 text-[0.68rem] text-dust">{records.length} records</span>}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-edge pt-4">
                  <div>
                    <div className="font-display text-xl text-cream">{price === 0 ? "Free" : `$${price}`}</div>
                    <div className="text-[0.62rem] text-amber">{capacity} seats · 0 booked</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Waveform bars={4} className="h-3 w-5" color={genre.sleeve.accent} playing={previewIsPlaying} />
                    <button
                      type="button"
                      onClick={playCratePreview}
                      disabled={!firstPlayable}
                      title={firstPlayable ? `Preview: ${firstPlayable.album} — ${firstPlayable.artist}` : "Add a record to preview"}
                      className="rounded-full bg-cream px-3 py-1.5 text-xs font-medium text-void transition-opacity clickable disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {previewIsPlaying ? "Pause" : "Preview"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void createWixEvent()}
              disabled={creating}
              className="mt-4 w-full rounded-full py-3.5 text-sm font-medium text-void transition-all clickable disabled:cursor-wait disabled:opacity-70"
              style={{ background: "linear-gradient(135deg,#e8b45f,#b45f2a)", boxShadow: "0 16px 40px -14px rgba(216,154,69,0.6)" }}
            >
              {creating
                ? createMessage || "Creating your room…"
                : member
                  ? isPrivate
                    ? "Create private Wix Event draft"
                    : "Create and publish Wix Event"
                  : "Sign in to create this event"}
            </button>
            <div className="mt-3 rounded-2xl border border-edge bg-pitch/45 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber shadow-[0_0_10px_rgba(226,165,82,0.8)]" />
                <span className="text-[0.58rem] uppercase tracking-[0.2em] text-beige">
                  Direct Wix Events publishing
                </span>
              </div>
              <p className="mt-1.5 text-[0.72rem] leading-relaxed text-dust">
                Signed-in members create the real ticketed event here. Its collectible cover is generated automatically in the same Vinyl Rooms style.
              </p>
            </div>
            {formError && <p className="mt-3 text-sm text-amber">{formError}</p>}
            {createdEvent && (
              <div className="mt-3 rounded-2xl border border-amber/35 bg-amber/10 p-3 text-left">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-[0.58rem] uppercase tracking-[0.2em] text-amber">
                      {createdEvent.status === "DRAFT" ? "Private draft created" : "Room published"}
                    </div>
                    <p className="mt-1 text-xs text-parchment">{createdEvent.message}</p>
                  </div>
                  {createdEvent.eventPageUrl?.startsWith("http") && (
                    <a
                      href={createdEvent.eventPageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full bg-cream px-3 py-1.5 text-xs font-medium text-void transition-transform hover:scale-[1.03] clickable"
                    >
                      View event
                    </a>
                  )}
                </div>
                <p className="mt-2 text-[0.68rem] text-dust">
                  Event details, tickets, visibility, crate notes, and the generated sleeve are now stored in Wix Events.
                </p>
              </div>
            )}
          </Reveal>
        </div>
      </div>
    </section>
  );
}
