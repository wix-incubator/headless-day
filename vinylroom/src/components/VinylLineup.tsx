"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import VinylDisc from "./VinylDisc";
import { usePlayer, type Track } from "./player/PlayerProvider";
import { getPreview } from "@/lib/previews";

export default function VinylLineup({
  records,
  accent,
  roomTitle,
  city,
}: {
  records: string[];
  accent: string;
  roomTitle?: string;
  city?: string;
}) {
  const [open, setOpen] = useState(true);
  const player = usePlayer();

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between clickable"
      >
        <span className="eyebrow">The vinyl lineup · {records.length} · tap to preview</span>
        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-edge text-cream transition-transform duration-300" style={{ transform: open ? "rotate(45deg)" : "none" }}>
          +
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            {records.map((r, i) => {
              const [artist, ...rest] = r.split(" — ");
              const preview = getPreview(r);
              const isThis = !!preview && player.current?.previewUrl === preview.previewUrl;
              const isPlaying = isThis && player.playing;

              const play = () => {
                if (!preview) return;
                const t: Track = {
                  record: r,
                  track: preview.track,
                  artist: preview.artist,
                  previewUrl: preview.previewUrl,
                  artwork: preview.artwork,
                  roomTitle,
                  city,
                  accent,
                };
                player.toggle(t);
              };

              return (
                <motion.li
                  key={r}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.06 * i, duration: 0.4 }}
                  className={`group flex items-center gap-4 border-b border-edge py-3 last:border-0 ${
                    preview ? "clickable" : ""
                  } ${isThis ? "-mx-2 rounded-lg bg-amber/5 px-2" : ""}`}
                  onClick={play}
                >
                  <span className="w-6 text-right font-mono text-xs text-dust">{String(i + 1).padStart(2, "0")}</span>

                  {/* disc doubles as a play/pause affordance */}
                  <span className="relative h-9 w-9 shrink-0">
                    <VinylDisc
                      accent={accent}
                      spinning={isPlaying}
                      className={`h-full w-full transition-transform duration-500 ${isPlaying ? "" : "group-hover:rotate-90"}`}
                    />
                    {preview && (
                      <span className="absolute inset-0 flex items-center justify-center rounded-full bg-void/45 text-[0.6rem] text-cream opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                            style={{ opacity: isThis ? 1 : undefined }}>
                        {isPlaying ? "❙❙" : "▶"}
                      </span>
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-cream">{rest.join(" — ")}</div>
                    <div className="truncate text-xs text-dust">
                      {artist}
                      {isThis && <span className="ml-2 text-amber">preview playing</span>}
                    </div>
                  </div>

                  {!preview && <span className="text-[0.6rem] text-dust/60">no preview</span>}
                </motion.li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
