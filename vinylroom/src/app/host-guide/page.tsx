import type { Metadata } from "next";
import HostResourcePage from "@/components/HostResourcePage";

export const metadata: Metadata = {
  title: "Host Guide — Vinyl Rooms",
  description: "A practical guide to hosting an intimate vinyl listening session.",
};

export default function HostGuidePage() {
  return (
    <HostResourcePage
      eyebrow="Host guide"
      title="A good room makes listening easy."
      summary="Keep the group small, choose a purposeful sequence, and give every side enough space to land."
    >
      <section>
        <h2>Before the night</h2>
        <ul>
          <li>Test the complete signal path and clean the records you plan to play.</li>
          <li>Arrange seats so every guest can listen comfortably without blocking the turntable.</li>
          <li>Share the start time, address, duration, and any house rules clearly.</li>
        </ul>
      </section>
      <section>
        <h2>During the session</h2>
        <p>Welcome the room, introduce the listening idea briefly, and keep conversation between sides or records. Leave enough quiet for the music to be the main event.</p>
      </section>
      <section>
        <h2>After the final side</h2>
        <p>Leave time for conversation, make the next steps clear to guests, and note which pacing, seating, and records worked best for the next room.</p>
      </section>
    </HostResourcePage>
  );
}
