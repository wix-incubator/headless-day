"use client";

import type { ReactNode } from "react";

export default function WarmPageLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  function warmPage() {
    void fetch(href, { credentials: "same-origin", priority: "low" }).catch(() => undefined);
  }

  return (
    <a href={href} onPointerEnter={warmPage} onFocus={warmPage} className={className}>
      {children}
    </a>
  );
}
