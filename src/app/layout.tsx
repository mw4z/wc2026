import type { Metadata, Viewport } from "next";
import { Archivo, IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";
import { dirFor } from "@/lib/i18n";
import { getLocale, getUI } from "@/lib/locale";
import { I18nProvider } from "@/components/I18nProvider";
import { AdScript } from "@/components/AdScript";

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

export async function generateMetadata(): Promise<Metadata> {
  const ui = await getUI();
  return {
    title: ui.appName,
    description: ui.appName,
    manifest: "/manifest.webmanifest",
    // iOS only allows Web Push when the site is installed to the Home Screen as a
    // standalone PWA — these tags make that possible.
    appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: ui.appName },
  };
}

export const viewport: Viewport = {
  themeColor: "#070b15",
  width: "device-width",
  initialScale: 1,
  // Lets `env(safe-area-inset-*)` resolve to real values on notched iPhones so
  // the bottom tab bar clears the home indicator.
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} dir={dirFor(locale)} className={`${display.variable} ${sans.variable}`}>
      <body className="min-h-screen">
        <I18nProvider locale={locale}>{children}</I18nProvider>
        <AdScript />
      </body>
    </html>
  );
}
