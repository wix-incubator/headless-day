import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy — Vinyl Listening Rooms",
  description: "How Vinyl Listening Rooms handles booking, member, and browser data.",
};

export default function PrivacyPolicy() {
  return (
    <LegalPage
      eyebrow="Privacy"
      title="Your listening data stays low-volume."
      summary="This policy explains what information Vinyl Rooms uses when you browse listening sessions, create a member account, reserve seats, or prepare a host draft."
    >
      <section>
        <h2>Information we handle</h2>
        <p>
          We may handle your name, email address, member profile details, selected event, seat quantity,
          reservation and order references, and the information you enter while using a booking flow.
          Payment details are entered in the Wix-hosted checkout and are not collected or stored directly
          by this website.
        </p>
        <p>
          If you prepare a host-room draft, the draft is stored locally in your browser. It is not submitted
          to us unless a future feature clearly asks you to send it.
        </p>
      </section>

      <section>
        <h2>How we use information</h2>
        <ul>
          <li>To show available listening rooms and complete seat reservations.</li>
          <li>To create and maintain a member session when you choose to sign in.</li>
          <li>To return you to the correct event after Wix checkout or authentication.</li>
          <li>To protect the service, diagnose failures, and keep core features reliable.</li>
        </ul>
      </section>

      <section>
        <h2>Wix and other service providers</h2>
        <p>
          Vinyl Rooms uses Wix for hosting, event listings, member authentication, reservations, redirects,
          and checkout. Wix and its payment partners process information under their own privacy terms when
          you use those services. We may also disclose information when required by law or to protect users
          and the service.
        </p>
      </section>

      <section>
        <h2>Browser storage</h2>
        <p>
          The site uses local storage to remember Wix member tokens and host drafts. Temporary OAuth data is
          held in session storage while a hosted sign-in is completed. You can remove this browser data by
          signing out, clearing site data, or clearing your browser storage.
        </p>
      </section>

      <section>
        <h2>Retention and your choices</h2>
        <p>
          Local browser data remains until you remove it. Wix retains member, reservation, and transaction
          records according to its service requirements and applicable law. You may request access,
          correction, or deletion of personal information where those rights apply. Requests concerning
          Wix-hosted checkout or member data may also need to be completed through Wix.
        </p>
      </section>

      <section>
        <h2>Updates</h2>
        <p>
          We may update this policy as the listening-room service develops. The latest version and its update
          date will always be published on this page.
        </p>
      </section>
    </LegalPage>
  );
}
