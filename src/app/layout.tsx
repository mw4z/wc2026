import type { Metadata, Viewport } from "next";
import { Archivo, IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";
import { UI } from "@/lib/constants";

// Display / numerals (Latin): broadcast-grade grotesque with heavy weights.
const display = Archivo({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

// UI + Arabic body: technical, distinctive, RTL-correct.
const sans = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: UI.appName,
  description: "لعبة التوقعات الداخلية لكأس العالم 2026",
};

export const viewport: Viewport = {
  themeColor: "#070b15",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${display.variable} ${sans.variable}`}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
