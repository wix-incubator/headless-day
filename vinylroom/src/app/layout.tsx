import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vinyl Listening Rooms — Host unforgettable nights around the records you love",
  description:
    "Create intimate vinyl listening sessions, invite real music lovers, and turn your collection into a shared evening. Small rooms. Deep cuts. Real conversation.",
  icons: {
    icon: "/icon.svg",
  },
  openGraph: {
    title: "Vinyl Listening Rooms",
    description:
      "A room. A record. A few people who really listen. Discover, host, and book intimate vinyl-based music events.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
