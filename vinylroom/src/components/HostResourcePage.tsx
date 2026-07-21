import type { ReactNode } from "react";
import SecondaryPageShell from "./SecondaryPageShell";

export default function HostResourcePage({
  eyebrow,
  title,
  summary,
  children,
}: {
  eyebrow: string;
  title: string;
  summary: string;
  children: ReactNode;
}) {
  return <SecondaryPageShell eyebrow={eyebrow} title={title} summary={summary}>{children}</SecondaryPageShell>;
}
