import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Use — Vinyl Listening Rooms",
  description: "Terms for browsing, hosting, and reserving Vinyl Listening Rooms sessions.",
};

export default function TermsOfUse() {
  return (
    <LegalPage
      eyebrow="Terms"
      title="A few house rules before the needle drops."
      summary="These terms apply when you browse Vinyl Rooms, create an account, prepare a host draft, or reserve a place at a listening session."
    >
      <section>
        <h2>Using Vinyl Rooms</h2>
        <p>
          You may use the site for personal, lawful participation in vinyl listening sessions. You must not
          interfere with the service, attempt unauthorized access, misuse another person&apos;s account, submit
          false booking information, or use the site to harm hosts, guests, or service providers.
        </p>
      </section>

      <section>
        <h2>Accounts</h2>
        <p>
          You are responsible for information submitted through your member account and for keeping your
          sign-in details secure. Tell us promptly if you believe your account has been used without
          permission. Wix provides the underlying member authentication service.
        </p>
      </section>

      <section>
        <h2>Rooms, reservations, and payments</h2>
        <p>
          Event details, availability, prices, venues, and schedules are shown for the relevant listening
          room. A reservation is not confirmed until the Wix checkout reports completion. Payments are
          processed through Wix and its payment partners; Vinyl Rooms does not directly receive your full
          payment-card details.
        </p>
        <p>
          Cancellation, refund, rescheduling, age, venue, and conduct rules may differ by event. Any specific
          terms shown during checkout or communicated for an event form part of your booking.
        </p>
      </section>

      <section>
        <h2>Hosting rooms</h2>
        <p>
          The host studio stores work in progress in your browser. A room is only created after a signed-in
          member submits the final step and Wix confirms the event. Hosts are responsible for accurate venue,
          schedule, capacity, pricing, and record-lineup information.
        </p>
      </section>

      <section>
        <h2>Content and intellectual property</h2>
        <p>
          The site&apos;s design, copy, software, and original visual elements are protected by applicable
          intellectual-property laws. Album artwork, artist names, event information, and third-party marks
          remain the property of their respective owners. You may not copy or commercially reuse site content
          without permission or another valid legal basis.
        </p>
      </section>

      <section>
        <h2>Availability and liability</h2>
        <p>
          We aim to keep room information and booking access accurate, but the service may occasionally be
          interrupted, delayed, or changed. To the extent permitted by law, Vinyl Rooms is not liable for
          indirect or consequential losses arising from use of the site. Nothing in these terms excludes
          rights or liability that cannot legally be excluded.
        </p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>
          We may update these terms as the service develops. Continued use after updated terms are published
          means the new terms apply from their stated update date, subject to any rights provided by law.
        </p>
      </section>
    </LegalPage>
  );
}
