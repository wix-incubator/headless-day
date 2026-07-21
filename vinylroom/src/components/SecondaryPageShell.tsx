import type { ReactNode } from "react";
import Link from "next/link";
import BackHomeButton from "./BackHomeButton";
import NewsletterSignup from "./NewsletterSignup";

export default function SecondaryPageShell({
  eyebrow,
  title,
  summary,
  children,
  legal = false,
}: {
  eyebrow: string;
  title: string;
  summary: string;
  children: ReactNode;
  legal?: boolean;
}) {
  return (
    <main className="secondary-page relative min-h-[100svh] overflow-hidden bg-void text-cream">
      <div className="secondary-page-grid pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute -left-40 top-20 h-[36rem] w-[36rem] rounded-full bg-amber/[0.07] blur-[110px]" />
      <div className="pointer-events-none absolute right-[-16rem] top-[24rem] h-[42rem] w-[42rem] rounded-full bg-burnt/[0.06] blur-[120px]" />

      <div className="relative mx-auto max-w-[100rem] px-5 py-6 sm:px-8 sm:py-8 lg:px-12">
        <nav className="flex items-center justify-between border-b border-edge pb-5" aria-label="Page navigation">
          <BackHomeButton className="group inline-flex items-center gap-3 text-parchment transition-colors hover:text-amber">
            Vinyl Rooms
          </BackHomeButton>
          <div className="hidden items-center gap-7 text-sm text-dust sm:flex">
            <Link href="/#rooms" className="transition-colors hover:text-cream">Rooms</Link>
            <Link href="/#host" className="transition-colors hover:text-cream">Host a night</Link>
          </div>
        </nav>

        <header className="grid gap-10 border-b border-edge py-14 sm:py-20 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)] lg:items-end lg:gap-16 lg:py-24">
          <div>
            <div className="eyebrow flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-amber shadow-[0_0_14px_rgba(226,165,82,0.75)]" />
              {eyebrow}
            </div>
            <h1 className="mt-6 max-w-5xl text-balance font-display text-[clamp(3.3rem,7.2vw,8.4rem)] leading-[0.86] tracking-[-0.05em]">
              {title}
            </h1>
          </div>
          <div className="lg:pb-2">
            <div className="mb-7 flex items-center gap-4" aria-hidden="true">
              <span className="relative flex h-14 w-14 items-center justify-center rounded-full border border-amber/30 grooves">
                <span className="h-3 w-3 rounded-full bg-amber" />
              </span>
              <span className="h-px flex-1 bg-gradient-to-r from-amber/55 to-transparent" />
            </div>
            <p className="max-w-2xl text-base leading-relaxed text-parchment sm:text-lg">{summary}</p>
            {legal && <p className="mt-5 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-dust">Last updated July 14, 2026</p>}
          </div>
        </header>

        <div className="grid gap-10 py-12 sm:py-16 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-16 lg:py-20">
          <aside className="h-fit lg:sticky lg:top-8">
            <p className="eyebrow text-amber">Listening notes</p>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-dust">
              {legal
                ? "Clear house rules for browsing, membership, reservations, and the information that makes those flows work."
                : "Practical guidance for a room where the records—not the equipment or the crowd—stay at the centre."}
            </p>
            <div className="mt-7 hidden h-32 w-32 rounded-full border border-edge grooves lg:block" aria-hidden="true" />
          </aside>
          <article className="legal-copy min-w-0">{children}</article>
        </div>

        <NewsletterSignup compact />

        <footer className="mt-10 flex flex-col gap-5 border-t border-edge py-8 text-sm text-dust sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 Vinyl Listening Rooms</span>
          <div className="flex items-center gap-6">
            {!legal && <Link href="/#host" className="text-amber transition-colors hover:text-cream">Open the room builder</Link>}
            <BackHomeButton className="text-parchment transition-colors hover:text-amber" />
          </div>
        </footer>
      </div>
    </main>
  );
}
