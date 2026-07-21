"use client";

import { useEffect, useRef } from "react";

/**
 * Premium cursor: a crisp amber dot on the pointer, a thin ring easing behind
 * it, and a soft warm glow that trails further back (blended additively so it
 * lights the artwork like a spotlight). Ring swells over interactive elements.
 * Desktop + fine-pointer + non-reduced-motion only; native cursor otherwise.
 */
export default function CustomCursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const glow = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduced) return;

    document.documentElement.classList.add("cursor-hidden");

    let mx = innerWidth / 2;
    let my = innerHeight / 2;
    let rx = mx, ry = my; // ring
    let gx = mx, gy = my; // glow (heavier lag)
    let scale = 1;
    let hovering = false;
    let down = false;
    let visible = false;
    let raf = 0;

    const show = (v: boolean) => {
      visible = v;
      const o = v ? "1" : "0";
      if (dot.current) dot.current.style.opacity = o;
      if (ring.current) ring.current.style.opacity = o;
      if (glow.current) glow.current.style.opacity = v ? "0.55" : "0";
    };

    const onMove = (e: PointerEvent) => {
      mx = e.clientX;
      my = e.clientY;
      if (!visible) show(true);
      hovering = !!(e.target as HTMLElement)?.closest?.(
        'a, button, [role="button"], input, textarea, select, label, .clickable',
      );
    };
    const onDown = () => (down = true);
    const onUp = () => (down = false);
    const onLeave = () => show(false);

    const loop = () => {
      rx += (mx - rx) * 0.2;
      ry += (my - ry) * 0.2;
      gx += (mx - gx) * 0.1;
      gy += (my - gy) * 0.1;
      scale += ((hovering ? 1.9 : down ? 0.7 : 1) - scale) * 0.2;
      if (dot.current) dot.current.style.transform = `translate3d(${mx}px, ${my}px, 0) translate(-50%, -50%)`;
      if (glow.current) glow.current.style.transform = `translate3d(${gx}px, ${gy}px, 0) translate(-50%, -50%)`;
      if (ring.current) {
        ring.current.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%) scale(${scale.toFixed(3)})`;
        ring.current.style.borderColor = hovering ? "rgba(226,165,82,0.85)" : "rgba(226,165,82,0.4)";
        ring.current.style.backgroundColor = hovering ? "rgba(226,165,82,0.1)" : "transparent";
      }
      raf = requestAnimationFrame(loop);
    };

    addEventListener("pointermove", onMove, { passive: true });
    addEventListener("pointerdown", onDown, { passive: true });
    addEventListener("pointerup", onUp, { passive: true });
    addEventListener("pointerleave", onLeave);
    raf = requestAnimationFrame(loop);
    return () => {
      document.documentElement.classList.remove("cursor-hidden");
      removeEventListener("pointermove", onMove);
      removeEventListener("pointerdown", onDown);
      removeEventListener("pointerup", onUp);
      removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[200] hidden md:block">
      {/* warm trailing glow */}
      <div
        ref={glow}
        className="absolute left-0 top-0 h-40 w-40 rounded-full opacity-0 blur-2xl transition-opacity duration-300"
        style={{
          background: "radial-gradient(circle, rgba(226,165,82,0.5), transparent 65%)",
          mixBlendMode: "plus-lighter",
        }}
      />
      {/* ring */}
      <div
        ref={ring}
        className="absolute left-0 top-0 h-9 w-9 rounded-full border opacity-0 transition-[background-color,border-color,opacity] duration-200 ease-out"
        style={{ borderColor: "rgba(226,165,82,0.4)" }}
      />
      {/* dot */}
      <div
        ref={dot}
        className="absolute left-0 top-0 h-2 w-2 rounded-full opacity-0"
        style={{ background: "#f0c074", boxShadow: "0 0 12px 2px rgba(226,165,82,0.9)" }}
      />
    </div>
  );
}
