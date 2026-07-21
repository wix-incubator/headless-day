"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import VinylDisc from "./VinylDisc";
import Waveform from "./Waveform";
import LiveWaveform from "./player/LiveWaveform";
import { usePlayer, type Track } from "./player/PlayerProvider";
import { artworkVariant } from "@/lib/artwork";
import { firstPlayable } from "@/lib/previews";
import { rooms as demoRooms, type Room } from "@/data/rooms";

/**
 * Floating player. Before anything plays it teases the rooms that are "now
 * spinning" and its play button starts that room's first previewable record.
 * Once audio is playing it becomes the real transport — album art, a
 * music-reactive waveform, scrubber, and play/pause.
 */
export default function NowPlayingWidget({ rooms = demoRooms }: { rooms?: Room[] }) {
  const player = usePlayer();
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(true);
  const [idx, setIdx] = useState(0);
  const [isDesktop, setIsDesktop] = useState(false);

  const spinning = rooms.filter((r) => r.nowSpinning);
  const active = player.current;

  useEffect(() => {
    const media = window.matchMedia("(min-width: 640px)");
    const update = () => setIsDesktop(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > window.innerHeight * 0.8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Cycle the teaser only while nothing real is playing.
  useEffect(() => {
    if (active || spinning.length === 0) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % spinning.length), 6000);
    return () => clearInterval(t);
  }, [active, spinning.length]);

  // Keep it on screen whenever audio is playing, even near the top.
  const show = visible || !!active;
  if (!isDesktop) return null;
  if (spinning.length === 0 && !active) return null;

  const teaser = spinning[idx % Math.max(spinning.length, 1)] ?? rooms[0];

  const playTeaser = () => {
    const hit = firstPlayable(teaser.records);
    if (!hit) return;
    const t: Track = {
      record: hit.record,
      track: hit.preview.track,
      artist: hit.preview.artist,
      previewUrl: hit.preview.previewUrl,
      artwork: hit.preview.artwork,
      roomTitle: teaser.title,
      city: teaser.city,
      accent: teaser.sleeve.accent,
    };
    player.toggle(t);
  };

  const accent = active?.accent ?? teaser.sleeve.accent;
  const isPlaying = player.playing;
  const teaserHit = firstPlayable(teaser.records);
  const coverArtwork = active?.artwork ?? teaserHit?.preview.artwork;
  const thumbArtwork = artworkVariant(coverArtwork, 100);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.9 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-4 left-4 z-40 hidden sm:block"
        >
          {open ? (
            <div
              className="w-[19rem] overflow-hidden rounded-2xl border border-edge bg-void/80 backdrop-blur-xl glow-warm transition-shadow duration-500"
              style={
                isPlaying
                  ? ({ "--pulse-color": `${accent}88`, animation: "ring-pulse 2.2s ease-out infinite" } as React.CSSProperties)
                  : undefined
              }
            >
              <div className="flex items-center gap-3 p-2.5 pr-3">
                {/* art / spinning disc */}
                <div className="relative h-12 w-12 shrink-0">
                  {isPlaying && (
                    <span
                      className="absolute inset-[-4px] rounded-full blur-md"
                      style={{ background: accent, opacity: 0.45, animation: "breathe 2.4s ease-in-out infinite" }}
                    />
                  )}
                  {thumbArtwork ? (
                    <div
                      className="h-full w-full overflow-hidden rounded-full ring-1 ring-edge"
                      style={{ animation: isPlaying ? "spin-slow 5s linear infinite" : undefined }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={thumbArtwork}
                        alt=""
                        width={48}
                        height={48}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover opacity-95"
                      />
                    </div>
                  ) : (
                    <VinylDisc accent={accent} spinning={isPlaying} label={teaser.genre} className="h-full w-full" />
                  )}
                  <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-void ring-1 ring-cream/20" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    {active ? (
                      <LiveWaveform bars={5} className="h-3 w-6" color={accent} />
                    ) : (
                      <Waveform bars={3} className="h-2.5 w-3" color={accent} />
                    )}
                    <span className="truncate text-[0.55rem] uppercase tracking-[0.2em] text-dust">
                      {active ? `Now playing · ${active.city ?? ""}` : `Now spinning · ${teaser.city}`}
                    </span>
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={active ? active.previewUrl : `t${idx}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="truncate text-sm text-cream">
                        {active ? active.track : (teaser.nowSpinning ?? "").split(" — ").slice(1).join(" — ")}
                      </div>
                      <div className="truncate text-xs text-dust">
                        {active ? active.artist : (teaser.nowSpinning ?? "").split(" — ")[0]}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label={isPlaying ? "Pause" : "Play"}
                    onClick={() => (active ? player.toggle(active) : playTeaser())}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-void clickable"
                    style={{ background: "linear-gradient(135deg,#e8b45f,#b45f2a)" }}
                  >
                    {isPlaying ? (
                      <span className="flex gap-[3px]"><i className="h-3 w-[3px] rounded-full bg-void" /><i className="h-3 w-[3px] rounded-full bg-void" /></span>
                    ) : (
                      <span className="ml-0.5 text-xs">▶</span>
                    )}
                  </button>
                  <button
                    type="button"
                    aria-label="Collapse"
                    onClick={() => setOpen(false)}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-dust transition-colors hover:text-cream clickable"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* scrubber — only meaningful with a real track */}
              <div className="h-0.5 w-full bg-edge">
                <div
                  className="h-full transition-[width] duration-200"
                  style={{ width: `${active ? player.progress * 100 : 0}%`, background: accent }}
                />
              </div>
            </div>
          ) : (
            <button
              type="button"
              aria-label="Open player"
              onClick={() => setOpen(true)}
              className="relative h-12 w-12 clickable"
            >
              {thumbArtwork ? (
                <span
                  className="block h-full w-full overflow-hidden rounded-full ring-1 ring-edge"
                  style={{ animation: isPlaying ? "spin-slow 5s linear infinite" : undefined }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumbArtwork}
                    alt=""
                    width={48}
                    height={48}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                </span>
              ) : (
                <VinylDisc accent={accent} spinning={isPlaying} className="h-full w-full" />
              )}
              <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber opacity-60" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-amber" />
              </span>
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
