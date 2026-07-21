import { useEffect, useState } from "react";

/**
 * Reset a navigation-busy flag when the page is restored from the
 * back/forward cache — e.g. the user closed the Wix login dialog and came
 * back, with React state frozen at "Redirecting…".
 */
export function useResetOnPageShow(setBusy: (v: boolean) => void) {
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) setBusy(false);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [setBusy]);
}

/**
 * Login navigation takes a moment (redirect to the Wix-hosted login page) —
 * show a spinner immediately and ignore further clicks.
 */
export default function LoginLink({
  className,
  label,
}: {
  className?: string;
  label: string;
}) {
  const [busy, setBusy] = useState(false);
  useResetOnPageShow(setBusy);
  return (
    <a
      href="/api/auth/login?returnUrl=/"
      className={`${className ?? ""} ${busy ? "auth-busy" : ""}`}
      aria-disabled={busy}
      onClick={(e) => {
        if (busy) {
          e.preventDefault();
          return;
        }
        setBusy(true);
      }}
    >
      {busy && <span className="auth-spinner" aria-hidden="true" />}
      {busy ? "Redirecting…" : label}
    </a>
  );
}
