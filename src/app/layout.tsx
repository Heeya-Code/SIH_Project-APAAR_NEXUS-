// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter/index.css";
import "@fontsource/instrument-serif/400-italic.css";
import "@fontsource-variable/source-serif-4/index.css";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/noto-sans-devanagari/500.css";
import "./globals.css";
import { Toaster } from "sonner";
import { PointerFx } from "@/components/fx/pointer-fx";

// Runs before first paint so the saved theme never flashes. Dark is the default.
const THEME_SCRIPT = `try{var d=document.documentElement,t=localStorage.getItem("nexus-theme"),a=localStorage.getItem("nexus-accent");if(t!=="light")d.classList.add("dark");d.dataset.accent=/^(teal|violet|blue|pink|gold)$/.test(a||"")?a:"violet"}catch(e){document.documentElement.classList.add("dark");document.documentElement.dataset.accent="violet"}`;

export const metadata: Metadata = {
  title: { default: "APAAR NEXUS", template: "%s · APAAR NEXUS" },
  description: "National Academic Identity & Intelligence Network. A Smart India Hackathon 2026 prototype (SIH26263). All data is synthetic.",
  robots: { index: false, follow: false },
  authors: [{ name: "Heeya-Code", url: "https://github.com/Heeya-Code" }],
  other: { copyright: "© 2026 Heeya-Code. All rights reserved." },
};
export const viewport: Viewport = { themeColor: "#070d1c", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} /></head>
      <body className="min-h-dvh antialiased">{children}<PointerFx /><div aria-hidden className="watermark" /><Toaster position="top-right" closeButton richColors theme="system" toastOptions={{ classNames: { toast: "font-sans" } }} /></body>
    </html>
  );
}
