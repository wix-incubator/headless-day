// ============================================================
// Motion controller — smooth inertial scroll + scroll reveals +
// subtle hero parallax + hide-on-scroll nav. Re-initializes on
// every Astro view-transition navigation (astro:page-load).
// All gated on <html class="motion"> (set only when motion is OK).
// ============================================================
import Lenis from "lenis";

let lenis: Lenis | null = null;
let io: IntersectionObserver | null = null;
let onScroll: (() => void) | null = null;

const motionOn = () =>
  typeof document !== "undefined" &&
  document.documentElement.classList.contains("motion");

function initLenis() {
  if (!motionOn()) return;
  lenis?.destroy();
  lenis = new Lenis({ lerp: 0.1, smoothWheel: true, wheelMultiplier: 1 });
  const raf = (t: number) => {
    lenis?.raf(t);
    requestAnimationFrame(raf);
  };
  requestAnimationFrame(raf);

  // route in-page anchors through Lenis for smooth jumps
  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (!id || id === "#") return;
      const target = document.querySelector(id);
      if (target) {
        e.preventDefault();
        lenis?.scrollTo(target as HTMLElement, { offset: -80 });
      }
    });
  });
}

function initReveals() {
  if (!motionOn()) return;
  io?.disconnect();

  // expand staggered groups: give each child an incremental delay
  document.querySelectorAll<HTMLElement>("[data-reveal-stagger]").forEach((group) => {
    Array.from(group.children).forEach((child, i) => {
      const el = child as HTMLElement;
      if (!el.hasAttribute("data-reveal")) el.classList.add("reveal");
      el.style.setProperty("--reveal-delay", `${i * 90}ms`);
    });
  });

  io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io?.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
  );
  document
    .querySelectorAll(".reveal, [data-reveal]")
    .forEach((el) => io!.observe(el));
}

function initParallax() {
  if (!motionOn()) return;
  if (onScroll) window.removeEventListener("scroll", onScroll);
  const layers = Array.from(
    document.querySelectorAll<HTMLElement>("[data-parallax]")
  );
  if (!layers.length) {
    onScroll = null;
    return;
  }
  let ticking = false;
  const apply = () => {
    const y = window.scrollY;
    layers.forEach((el) => {
      const speed = parseFloat(el.dataset.parallax || "0");
      el.style.transform = `translate3d(0, ${y * speed}px, 0)`;
    });
    ticking = false;
  };
  onScroll = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(apply);
    }
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  apply();
}

function initNav() {
  if (!motionOn()) return;
  const nav = document.querySelector<HTMLElement>(".nav-shell");
  if (!nav) return;
  let lastY = window.scrollY;
  const handler = () => {
    const y = window.scrollY;
    if (y > 240 && y > lastY) nav.classList.add("nav-hidden");
    else nav.classList.remove("nav-hidden");
    lastY = y;
  };
  window.addEventListener("scroll", handler, { passive: true });
}

function initStickyBar() {
  // Hide the mobile booking bar on the booking page so it can't cover the form.
  const bar = document.getElementById("mobile-sticky-bar");
  if (bar) bar.style.display = location.pathname.startsWith("/visit") ? "none" : "";
}

function setup() {
  // Re-assert the motion gate (a view-transition swap can reset <html> attrs).
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.documentElement.classList.add("motion");
  }
  initReveals();
  initParallax();
  initNav();
  initStickyBar();
  initLenis();
}

document.addEventListener("astro:page-load", setup);
// Reset transient state before swapping documents
document.addEventListener("astro:before-swap", () => {
  io?.disconnect();
  if (onScroll) window.removeEventListener("scroll", onScroll);
});
