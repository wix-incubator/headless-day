import type { Metadata } from "next";
import HostResourcePage from "@/components/HostResourcePage";

export const metadata: Metadata = {
  title: "Equipment Tips — Vinyl Rooms",
  description: "A simple equipment checklist for a reliable vinyl listening room.",
};

export default function EquipmentPage() {
  return (
    <HostResourcePage
      eyebrow="Equipment tips"
      title="Reliable sound beats complicated sound."
      summary="A well-set turntable, clean records, sensible levels, and a quiet room matter more than an elaborate equipment list."
    >
      <section>
        <h2>Core signal path</h2>
        <ul>
          <li>Turntable with the correct tracking force and a clean stylus.</li>
          <li>A matching phono preamp, integrated amplifier, or receiver with a phono input.</li>
          <li>Two stable speakers positioned clear of the turntable to limit feedback.</li>
        </ul>
      </section>
      <section>
        <h2>Before guests arrive</h2>
        <ul>
          <li>Play both channels and listen for hum, distortion, or mistracking.</li>
          <li>Set a comfortable reference volume, then keep headroom for louder records.</li>
          <li>Keep a carbon-fibre brush, stylus brush, spare inner sleeves, and a safe record-resting area nearby.</li>
        </ul>
      </section>
    </HostResourcePage>
  );
}
