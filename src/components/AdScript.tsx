import Script from "next/script";
import { ADSENSE_CLIENT_ID } from "@/lib/ads";

// Loads the Google AdSense library whenever a client id exists — independent of
// whether ad UNITS are enabled — so AdSense can verify site ownership and review
// the site. Renders nothing only if there's no client id.
export function AdScript() {
  if (!ADSENSE_CLIENT_ID) return null;
  return (
    <Script
      id="adsbygoogle-lib"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
      strategy="afterInteractive"
      crossOrigin="anonymous"
    />
  );
}
