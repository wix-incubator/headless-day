import type { Metadata } from "next";
import HostResourcePage from "@/components/HostResourcePage";

export const metadata: Metadata = {
  title: "Open a Listening Room — Vinyl Rooms",
  description: "Prepare a small, record-led listening night and continue in Wix Events.",
};

export default function HostPage() {
  return (
    <HostResourcePage
      eyebrow="Open a room"
      title="Build the night around the records."
      summary="Use the room builder to shape the title, date, mood, capacity, seat price, and record crate before creating the ticketed event in Wix."
    >
      <section>
        <h2>What you prepare</h2>
        <ul>
          <li>A clear title, date, start time, and venue.</li>
          <li>A small capacity suited to attentive listening.</li>
          <li>A focused crate and a mood that tells guests what the night will feel like.</li>
          <li>A free or paid seat price and public or private visibility.</li>
        </ul>
      </section>
      <section>
        <h2>How publishing works</h2>
        <p>Sign in as a Vinyl Rooms member, finish the room builder, and create the event directly. The connected Wix Events backend publishes public rooms, creates the ticket definition, and keeps reservations and capacity in one place.</p>
      </section>
    </HostResourcePage>
  );
}
