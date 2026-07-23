import { useEffect, useRef, useState } from "react";

interface Props {
  text: string;
  size?: "sm" | "lg";
  /** sub-route line under the sign, e.g. "14 · Alberta" */
  sub?: string;
}

/**
 * Destination roll-sign — the sitewide signature device.
 * Letters "flip" into place left-to-right when the sign scrolls into
 * view. Honors prefers-reduced-motion (renders already-set, no flip).
 */
export default function RollSign({ text, size = "sm", sub }: Props) {
  const [lit, setLit] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const reduce =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || typeof IntersectionObserver === "undefined") {
      setLit(true);
      return;
    }
    const el = ref.current;
    if (!el) return setLit(true);
    const fallback = setTimeout(() => setLit(true), 1200);
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setLit(true);
            io.disconnect();
          }
        });
      },
      { threshold: 0.2, rootMargin: "0px 0px -10% 0px" }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      clearTimeout(fallback);
    };
  }, []);

  const chars = String(text).toUpperCase().split("");
  const big = size === "lg";
  // Sized so a typical destination (≤ ~10 chars) fits one row inside a
  // card column without wrapping vertically.
  const W = big ? "clamp(18px,4.4vw,38px)" : "clamp(15px,3.4vw,22px)";
  const H = big ? "clamp(30px,6.4vw,56px)" : "clamp(24px,5vw,33px)";
  const fs = big ? "clamp(15px,3.4vw,32px)" : "clamp(13px,2.9vw,19px)";
  const blankW = big ? "clamp(8px,1.8vw,16px)" : "7px";

  return (
    <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: "10px", maxWidth: "100%" }}>
      <span
        ref={ref}
        aria-label={text}
        role="img"
        style={{
          display: "inline-flex",
          flexWrap: "nowrap",
          alignItems: "center",
          justifyContent: "center",
          gap: big ? "clamp(2px,0.6vw,4px)" : "2px",
          maxWidth: "100%",
        }}
      >
        {chars.map((ch, i) => {
          if (ch === " ")
            return <span key={i} style={{ display: "inline-block", width: blankW, height: H }} />;
          const stagger = i * 40;
          return (
            <span
              key={i}
              aria-hidden="true"
              style={{
                display: "inline-flex",
                flexShrink: 0,
                alignItems: "center",
                justifyContent: "center",
                width: W,
                height: H,
                background: "#1C220E",
                borderRadius: "2px",
                overflow: "hidden",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 600,
                  fontSize: fs,
                  lineHeight: 1,
                  letterSpacing: "0.02em",
                  color: "#DEFF4E",
                  transform: lit ? "translateY(0)" : "translateY(0.5em)",
                  opacity: lit ? 1 : 0,
                  transition: `transform .5s cubic-bezier(.2,.7,.2,1) ${stagger}ms, opacity .42s ease ${stagger}ms`,
                }}
              >
                {ch}
              </span>
            </span>
          );
        })}
      </span>
      {sub && (
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            letterSpacing: "3px",
            textTransform: "uppercase",
            color: "#6f93a3",
            fontSize: big ? "clamp(13px,1.6vw,16px)" : "12px",
          }}
        >
          {sub}
        </span>
      )}
    </span>
  );
}
