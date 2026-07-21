"use client";

import { type Room } from "@/data/rooms";
import { LayoutGroup } from "framer-motion";
import { useEffect } from "react";
import { MemberProvider } from "@/components/member/MemberProvider";
import { PlayerProvider } from "@/components/player/PlayerProvider";
import { BookingProvider } from "@/components/booking/BookingProvider";
import SpotlightBackground from "@/components/SpotlightBackground";
import NoiseOverlay from "@/components/NoiseOverlay";
import CustomCursor from "@/components/CustomCursor";
import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import FeaturedRooms from "@/components/FeaturedRooms";
import HowItWorks from "@/components/HowItWorks";
import NowPlayingWidget from "@/components/NowPlayingWidget";
import DeferredPageSections from "@/components/DeferredPageSections";

function nextDetailedRoom(rooms: Room[]) {
  const datedRooms = rooms
    .filter((room) => room.startDate && !Number.isNaN(Date.parse(room.startDate)))
    .sort((left, right) => Date.parse(left.startDate!) - Date.parse(right.startDate!));
  return datedRooms[0] ?? rooms.find((room) => room.featured) ?? rooms[0];
}

export default function AppShell({
  rooms,
  source,
}: {
  rooms: Room[];
  source: "wix" | "mock";
}) {
  const detailedRoom = nextDetailedRoom(rooms);

  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;

    let cancelled = false;
    const alignHashTarget = () => {
      if (!cancelled) {
        document.getElementById(id)?.scrollIntoView({ block: "start", behavior: "auto" });
      }
    };

    const frame = requestAnimationFrame(() => requestAnimationFrame(alignHashTarget));
    const timers = [window.setTimeout(alignHashTarget, 250), window.setTimeout(alignHashTarget, 900)];
    void document.fonts?.ready.then(alignHashTarget);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      timers.forEach(window.clearTimeout);
    };
  }, []);

  return (
    <MemberProvider>
      <PlayerProvider>
        <LayoutGroup id="vinyl-room-flow">
          <BookingProvider>
            <SpotlightBackground />
            <NoiseOverlay />
            <CustomCursor />
            <Navigation source={source} roomCount={rooms.length} />
            <NowPlayingWidget rooms={rooms} />

            <main className="relative">
              <Hero rooms={rooms} />
              <FeaturedRooms rooms={rooms} source={source} />
              <HowItWorks />
              {detailedRoom ? <DeferredPageSections event={detailedRoom} /> : null}
            </main>
          </BookingProvider>
        </LayoutGroup>
      </PlayerProvider>
    </MemberProvider>
  );
}
