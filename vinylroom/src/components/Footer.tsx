import NewsletterSignup from "./NewsletterSignup";
import ContactForm from "./ContactForm";
import WarmPageLink from "./WarmPageLink";

const cols = [
  {
    title: "Discover",
    links: [
      { label: "Upcoming rooms", href: "#rooms" },
      { label: "A night in full", href: "#event" },
      { label: "How it works", href: "#how" },
      { label: "By mood", href: "#rooms" },
    ],
  },
  {
    title: "Host",
    links: [
      { label: "Open a room", href: "/host.html" },
      { label: "Host guide", href: "/host-guide.html" },
      { label: "Equipment tips", href: "/equipment.html" },
      { label: "Pricing", href: "/pricing.html" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Our story", href: "#community" },
      { label: "Collector culture", href: "#community" },
      { label: "Journal", href: "#community" },
      { label: "Contact", href: "#contact" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-edge bg-pitch/50">
      <div className="mx-auto max-w-[100rem] px-5 py-16 sm:px-8">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <div className="flex items-center gap-3">
              <span className="relative flex h-8 w-8 items-center justify-center">
                <span className="absolute inset-0 rounded-full grooves" />
                <span className="relative h-2.5 w-2.5 rounded-full bg-amber" />
              </span>
              <span className="font-display text-xl text-cream">Vinyl Rooms</span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-parchment">
              Curated nights for people who still care about albums. A room, a record,
              and a few people who really listen.
            </p>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <div className="text-[0.68rem] uppercase tracking-[0.2em] text-dust">{c.title}</div>
              <ul className="mt-4 space-y-2.5">
                {c.links.map((l) => (
                  <li key={l.label}>
                    {l.href.startsWith("/") ? (
                      <WarmPageLink href={l.href} className="text-sm text-parchment transition-colors hover:text-cream clickable">{l.label}</WarmPageLink>
                    ) : (
                      <a href={l.href} className="text-sm text-parchment transition-colors hover:text-cream clickable">{l.label}</a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12">
          <ContactForm />
        </div>

        <div className="mt-6">
          <NewsletterSignup />
        </div>

        <a
          href="https://www.instagram.com/vinylroom.online/"
          target="_blank"
          rel="noreferrer"
          aria-label="Follow Vinyl Rooms on Instagram"
          className="group relative mt-6 flex overflow-hidden rounded-2xl border border-amber/20 bg-gradient-to-r from-amber/[0.08] via-pitch/70 to-burnt/[0.08] p-4 transition-[border-color,transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:border-amber/45 hover:shadow-[0_20px_60px_-28px_rgba(226,165,82,0.5)] sm:items-center sm:gap-5 sm:p-5"
        >
          <span className="pointer-events-none absolute inset-0 translate-x-[-110%] bg-[linear-gradient(110deg,transparent_25%,rgba(248,240,221,0.08)_48%,transparent_70%)] transition-transform duration-700 group-hover:translate-x-[110%]" />
          <span className="relative mr-4 flex h-14 w-14 shrink-0 items-center justify-center sm:mr-0">
            <span className="absolute inset-0 rounded-full border border-amber/30 grooves transition-transform duration-700 group-hover:rotate-90" />
            <svg viewBox="0 0 24 24" aria-hidden="true" className="relative h-5 w-5 text-amber" fill="none" stroke="currentColor" strokeWidth="1.6">
              <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.5" cy="6.7" r="0.8" fill="currentColor" stroke="none" />
            </svg>
          </span>

          <span className="relative min-w-0 flex-1">
            <span className="block text-[0.58rem] uppercase tracking-[0.24em] text-amber">From the listening room</span>
            <span className="mt-1 block font-display text-xl text-cream sm:text-2xl">Follow the next needle drop.</span>
            <span className="mt-1 block truncate text-xs text-dust sm:text-sm">@vinylroom.online · records, rooms, and nights in progress</span>
          </span>

          <span className="relative ml-auto hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border border-edge text-lg text-parchment transition-colors group-hover:border-amber/45 group-hover:text-amber sm:flex" aria-hidden="true">
            ↗
          </span>
        </a>

        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-edge pt-6 text-xs text-dust sm:flex-row sm:items-center">
          <span>© 2026 Vinyl Listening Rooms — a concept, pressed with care.</span>
          <span className="flex gap-6">
            <WarmPageLink href="/privacy.html" className="transition-colors hover:text-cream">Privacy</WarmPageLink>
            <WarmPageLink href="/terms.html" className="transition-colors hover:text-cream">Terms</WarmPageLink>
            <a
              href="https://www.instagram.com/vinylroom.online/"
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-cream"
            >
              Instagram
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
