import type { Metadata, Viewport } from "next";
import { Archivo, IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";
import { dirFor } from "@/lib/i18n";
import { getLocale, getUI } from "@/lib/locale";
import { I18nProvider } from "@/components/I18nProvider";
import { AdScript } from "@/components/AdScript";
import { ADSENSE_CLIENT_ID } from "@/lib/ads";
import { SITE_URL } from "@/lib/site";

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
    metadataBase: new URL(SITE_URL),
    title: ui.appName,
    description: ui.appName,
    manifest: "/manifest.webmanifest",
    // Default social preview (pages override title/description/url as needed).
    openGraph: {
      type: "website",
      siteName: "GamePredict",
      url: SITE_URL,
      title: ui.appName,
      description: ui.appName,
      locale: "ar_SA",
      images: [{ url: "/og-default.png", width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: ui.appName,
      description: ui.appName,
      images: ["/og-default.png"],
    },
    // iOS only allows Web Push when the site is installed to the Home Screen as a
    // standalone PWA — these tags make that possible.
    appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: ui.appName },
    // AdSense site-ownership verification (static <meta> in <head>).
    ...(ADSENSE_CLIENT_ID ? { other: { "google-adsense-account": ADSENSE_CLIENT_ID } } : {}),
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
        {/* Capture Chrome's beforeinstallprompt the instant it fires — it often
            arrives before React hydrates, so a listener added in a component's
            effect would miss it (the "no Add to Home Screen button" bug). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__wc26InstallPrompt=e;window.dispatchEvent(new Event('wc26:install-ready'));});window.addEventListener('appinstalled',function(){window.__wc26InstallPrompt=null;window.__wc26Installed=true;});})();`,
          }}
        />
        <I18nProvider locale={locale}>{children}</I18nProvider>
        <AdScript />
      </body>
    </html>
  );
}
