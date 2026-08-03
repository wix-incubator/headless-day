import type { ReactNode } from "react";
import { defaultLockHint, meetsCapability, type Capability } from "../../lib/members/capability";
import { useCapability } from "./useCapability";

interface Props {
  /** Minimum tier needed to use the feature. Default: signed-in member. */
  required?: Capability;
  /** Override the default hint ("Sign in to unlock this" / "Upgrade …"). */
  hint?: string;
  children: ReactNode;
}

/**
 * Wraps a member-gated feature: renders it normally when the player's capability meets `required`,
 * otherwise dims it and overlays a lock + hint + the right call-to-action (Sign in / Upgrade).
 * The reusable primitive behind every "membership unlocks this" prompt (Track B).
 */
export default function LockedFeature({ required = "member", hint, children }: Props) {
  const { loading, capability } = useCapability();
  // While we don't yet know, show the feature (avoids a lock flash for members).
  if (loading || meetsCapability(capability, required)) return <>{children}</>;

  const message = hint ?? defaultLockHint(required);
  const returnUrl = typeof window !== "undefined" ? window.location.pathname + window.location.search : "/";
  const cta =
    required === "paid"
      ? { label: "Upgrade", href: "/account" } // B3 wires this to the pricing/checkout flow
      : { label: "Sign in", href: `/api/auth/login?returnToUrl=${encodeURIComponent(returnUrl)}` };

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <div aria-hidden style={{ opacity: 0.35, filter: "grayscale(1)", pointerEvents: "none" }}>
        {children}
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          textAlign: "center",
          padding: 8,
        }}
      >
        <span aria-hidden style={{ fontSize: 20 }}>🔒</span>
        <span style={{ fontSize: 12, fontWeight: 600 }}>{message}</span>
        <a
          href={cta.href}
          data-astro-reload
          data-astro-prefetch="false"
          className="rounded-md bg-sky-500 px-3 py-1 text-xs font-semibold text-white hover:bg-sky-400"
        >
          {cta.label}
        </a>
      </div>
    </div>
  );
}
