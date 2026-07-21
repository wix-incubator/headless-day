import { Suspense } from "react";
import type { Metadata } from "next";
import ThankYouContent from "@/components/ThankYouContent";
import { PlayerProvider } from "@/components/player/PlayerProvider";

export const metadata: Metadata = {
  title: "Your seat is saved — Vinyl Listening Rooms",
  robots: { index: false },
};

export default function ThankYou() {
  return (
    <PlayerProvider introEnabled={false}>
      <Suspense>
        <ThankYouContent />
      </Suspense>
    </PlayerProvider>
  );
}
