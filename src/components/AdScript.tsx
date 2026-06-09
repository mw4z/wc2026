import Script from "next/script";
import { adsActive, ADSENSE_CLIENT_ID } from "@/lib/ads";

// Loads the Google AdSense library — ONLY when ads are enabled and a client id
// exists. Renders nothing otherwise (no script, no network call).
export function AdScript() {
  if (!adsActive) return null;
  return (
    <Script
      id="adsbygoogle-lib"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
      strategy="afterInteractive"
      async
      crossOrigin="anonymous"
    />
  );
}
