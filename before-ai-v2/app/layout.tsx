import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Code Before AI | Windows XP Story Events",
  description:
    "A Windows XP-inspired event site where old programmers tell stories about writing code before AI.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
