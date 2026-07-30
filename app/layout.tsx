import type { Metadata, Viewport } from "next";
import { Fraunces, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600"],
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-plex-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Vibechord — turn a vibe into a song you can play",
  description:
    "Describe a mood, get back a real chord progression, scale map, and tabs you can actually play.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Vibechord",
  },
  // FIX: this was dropped when the layout got simplified for the dvh
  // fix earlier — restoring it is what actually puts your logo in the
  // browser tab. "icon" is the standard favicon (tab icon, bookmarks),
  // "apple" is what shows on an iPhone home screen if someone adds
  // your site there.
  icons: {
    icon: "/favicon.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#1B1712",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      {/*
        100dvh tracks the REAL visible viewport on mobile (address bar
        included/excluded correctly), instead of h-screen's 100vh which
        counts space that isn't actually visible.
      */}
      <body
        className={`${fraunces.variable} ${inter.variable} ${plexMono.variable} bg-rosewood text-parchment h-[100dvh] w-screen overflow-hidden antialiased overscroll-none`}
      >
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}