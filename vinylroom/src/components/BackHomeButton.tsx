"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- Native navigation is intentional here so the browser can restore the cached homepage instantly. */

import type { MouseEvent } from "react";

export default function BackHomeButton({
  className = "",
  children = "Return home",
}: {
  className?: string;
  children?: string;
}) {
  function returnHome(event: MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();

    const cameFromThisSite = (() => {
      try {
        return Boolean(document.referrer) && new URL(document.referrer).origin === window.location.origin;
      } catch {
        return false;
      }
    })();

    if (cameFromThisSite && window.history.length > 1) {
      window.history.back();
      return;
    }

    window.location.assign("/");
  }

  return (
    <a href="/" onClick={returnHome} className={className}>
      {children}
    </a>
  );
}
