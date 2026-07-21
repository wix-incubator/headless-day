import type { Metadata } from "next";
import HostResourcePage from "@/components/HostResourcePage";

export const metadata: Metadata = {
  title: "Host Pricing — Vinyl Rooms",
  description: "How seat pricing works when preparing a Vinyl Rooms event.",
};

export default function PricingPage() {
  return (
    <HostResourcePage
      eyebrow="Pricing"
      title="Choose a price that fits the room."
      summary="The room builder lets you set the capacity and per-seat price—including a free event—before you continue to Wix Events."
    >
      <section>
        <h2>Set the seat price</h2>
        <p>Choose a price that reflects the room, duration, refreshments, preparation, and the number of seats. Guests see the event price before they reserve.</p>
      </section>
      <section>
        <h2>Ticketing and payment</h2>
        <p>Published events, ticket availability, reservations, checkout, and payments are handled through the connected Wix Events setup. Any applicable Wix or payment-processing charges are governed by the host&apos;s connected Wix plan and payment provider.</p>
      </section>
      <section>
        <h2>Free rooms</h2>
        <p>Set the seat price to zero when the listening session is invitation-led or free to attend. Capacity still matters so the room remains comfortable.</p>
      </section>
    </HostResourcePage>
  );
}
