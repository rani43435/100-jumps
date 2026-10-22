import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "100 Jumps",
  description: "Complete 100 jumps, race the clock, and join the public leaderboard.",
  manifest: "/manifest.json",
  icons: {
    icon: "/assets/favicon.ico",
    shortcut: "/assets/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
