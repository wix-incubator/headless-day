"use client";

import type { Room } from "@/data/rooms";
import EventDetailPreview from "@/components/EventDetailPreview";
import CreateRoomPreview from "@/components/CreateRoomPreview";
import Community from "@/components/Community";
import FinalCTA from "@/components/FinalCTA";
import Footer from "@/components/Footer";

export default function DeferredPageSections({ event }: { event: Room }) {
  return (
    <>
      <EventDetailPreview event={event} />
      <CreateRoomPreview />
      <Community />
      <FinalCTA />
      <Footer />
    </>
  );
}
