"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useBooking } from "./booking/BookingProvider";
import { type Room } from "@/data/rooms";

/**
 * Sticky reservation panel with a mock seat picker. Seats fill a ring around
 * the room; taken seats are dimmed, the rest are selectable up to seatsLeft.
 */
export default function BookingPanel({ room }: { room: Room }) {
  const taken = room.capacity - room.seatsLeft;
  const [selected, setSelected] = useState<number[]>([]);
  const { open } = useBooking();

  const toggle = (i: number) => {
    if (i < taken) return; // taken
    setSelected((prev) =>
      prev.includes(i) ? prev.filter((s) => s !== i) : [...prev, i],
    );
  };

  const count = selected.length || 1;

  return (
    <div className="lg:sticky lg:top-24">
      <div className="rounded-3xl border border-edge bg-gradient-to-b from-charcoal/70 to-pitch/80 p-6 glow-warm">
        <div className="flex items-baseline justify-between">
          <div>
            <span className="font-display text-3xl text-cream">{room.price}</span>
            <span className="ml-1 text-sm text-dust">/ seat</span>
          </div>
          <div className="flex items-center gap-1 rounded-full border border-edge px-2.5 py-1">
            <span className="text-amber">★</span>
            <span className="text-sm text-cream">4.9</span>
          </div>
        </div>

        {/* seat picker */}
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between text-[0.7rem]">
            <span className="eyebrow text-[0.62rem]">Choose your seats</span>
            <span className="text-amber">{room.seatsLeft} left</span>
          </div>
          <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-8">
            {Array.from({ length: room.capacity }).map((_, i) => {
              const isTaken = i < taken;
              const isSel = selected.includes(i);
              return (
                <button
                  key={i}
                  type="button"
                  disabled={isTaken}
                  onClick={() => toggle(i)}
                  aria-label={isTaken ? "Taken" : isSel ? "Selected" : "Available"}
                  className={`relative flex aspect-square items-center justify-center rounded-md border text-[0.55rem] transition-all duration-200 clickable ${
                    isTaken
                      ? "cursor-not-allowed border-edge bg-espresso/60 text-dust/50"
                      : isSel
                        ? "border-amber bg-amber font-semibold text-void"
                        : "border-edge-strong bg-void/30 text-cream/80 hover:border-amber/70 hover:bg-amber/10 hover:text-cream"
                  }`}
                >
                  {isTaken ? "×" : i + 1}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-4 text-[0.62rem] text-dust">
            <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm border border-edge-strong" /> Free</span>
            <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-amber" /> Yours</span>
            <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-espresso/60 ring-1 ring-edge" /> Taken</span>
          </div>
        </div>

        <div className="mt-6 space-y-2 border-t border-edge pt-4 text-sm">
          <div className="flex justify-between text-parchment">
            <span>{room.price} × {count} {count > 1 ? "seats" : "seat"}</span>
            <span className="text-cream">{count} × {room.price}</span>
          </div>
          <div className="flex justify-between text-parchment">
            <span>Host contribution</span>
            <span className="text-cream">included</span>
          </div>
        </div>

        <motion.button
          type="button"
          onClick={() => open(room)}
          whileTap={{ scale: 0.98 }}
          className="mt-5 w-full rounded-full py-3.5 text-sm font-medium text-void clickable"
          style={{ background: "linear-gradient(135deg,#e8b45f,#b45f2a)", boxShadow: "0 16px 40px -14px rgba(216,154,69,0.6)" }}
        >
          Reserve {count > 1 ? `${count} seats` : "your seat"}
        </motion.button>
        <p className="mt-3 text-center text-[0.68rem] text-dust">
          You won&apos;t be charged until the host confirms the room.
        </p>
      </div>

      {/* host card */}
      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-edge bg-pitch/50 p-4">
        <span
          className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold text-void"
          style={{ background: `linear-gradient(135deg, ${room.sleeve.accent}, ${room.sleeve.from})` }}
        >
          {room.hostInitials}
        </span>
        <div className="min-w-0">
          <div className="text-sm text-cream">Hosted by {room.host}</div>
          <div className="text-xs text-dust">14 rooms · responds within an hour</div>
        </div>
      </div>
    </div>
  );
}
