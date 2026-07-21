"use client";

import { useRef, type ReactNode } from "react";
import { motion, useMotionValue, useSpring, useReducedMotion } from "framer-motion";

type Props = {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "ghost";
  className?: string;
  strength?: number;
};

/**
 * A button/link that eases toward the cursor while hovered, then springs back.
 * The label counter-shifts slightly for a subtle magnetic depth.
 */
export default function MagneticButton({
  children,
  href,
  onClick,
  variant = "primary",
  className = "",
  strength = 0.35,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const rect = useRef<{ cx: number; cy: number } | null>(null);
  const reduce = useReducedMotion();

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, { stiffness: 180, damping: 15, mass: 0.3 });
  const y = useSpring(my, { stiffness: 180, damping: 15, mass: 0.3 });

  const cacheRect = () => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    rect.current = { cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
  };
  const handleMove = (e: React.MouseEvent) => {
    if (reduce || !rect.current) return;
    mx.set((e.clientX - rect.current.cx) * strength);
    my.set((e.clientY - rect.current.cy) * strength);
  };
  const reset = () => {
    rect.current = null;
    mx.set(0);
    my.set(0);
  };

  const base =
    "relative inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-medium tracking-tight transition-colors duration-300 clickable select-none";
  const styles =
    variant === "primary"
      ? "text-void"
      : "text-cream border border-edge-strong hover:border-amber/50";

  const inner = (
    <motion.div
      ref={ref}
      onMouseEnter={cacheRect}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      style={{ x, y }}
      className={`${base} ${styles} ${className}`}
    >
      {variant === "primary" && (
        <span
          className="absolute inset-0 rounded-full"
          style={{
            background: "linear-gradient(135deg, #e8b45f, #b45f2a)",
            boxShadow: "0 12px 40px -12px rgba(216,154,69,0.6)",
          }}
        />
      )}
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </motion.div>
  );

  if (href) {
    return (
      <a href={href} className="inline-block">
        {inner}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className="inline-block bg-transparent">
      {inner}
    </button>
  );
}
