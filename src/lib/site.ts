// Canonical production origin — used to build ABSOLUTE URLs for Open Graph /
// Twitter tags (WhatsApp etc. require absolute image/URL). Override via env.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.gamepredict.net").replace(
  /\/$/,
  "",
);
