// AdSense configuration. All flags come from NEXT_PUBLIC_* env vars (inlined at
// build time). Ads are OFF unless explicitly enabled AND a client id is present.
export const ADS_ENABLED = process.env.NEXT_PUBLIC_ENABLE_ADS === "true";
// Publisher id. Defaults to the site's AdSense client so the loader + ownership
// meta tag are always present for verification, even before ad units are turned on.
export const ADSENSE_CLIENT_ID =
  process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || "ca-pub-1652319526796223";

// Actual ad UNITS only render when explicitly enabled (and a client id exists).
// The loader script/meta are separate and load whenever a client id is present.
export const adsActive = ADS_ENABLED && ADSENSE_CLIENT_ID.length > 0;

// Slot ids (a missing slot renders nothing — see AdSlot).
export const AD_SLOTS = {
  matchesTop: process.env.NEXT_PUBLIC_ADSENSE_MATCHES_TOP_SLOT || "",
  leaderboardTop: process.env.NEXT_PUBLIC_ADSENSE_LEADERBOARD_TOP_SLOT || "",
  groupTop: process.env.NEXT_PUBLIC_ADSENSE_GROUP_TOP_SLOT || "",
  rulesBottom: process.env.NEXT_PUBLIC_ADSENSE_RULES_BOTTOM_SLOT || "",
  faqBottom: process.env.NEXT_PUBLIC_ADSENSE_FAQ_BOTTOM_SLOT || "",
} as const;

// Support contact is a WhatsApp number. Display form keeps spaces/“+” for
// readability; the wa.me link uses the digits only.
export const CONTACT_WHATSAPP = process.env.NEXT_PUBLIC_CONTACT_WHATSAPP || "+966 55 789 7925";
export const CONTACT_WHATSAPP_LINK = `https://wa.me/${CONTACT_WHATSAPP.replace(/\D/g, "")}`;

// Official X (Twitter) account.
export const SOCIAL_X_URL = process.env.NEXT_PUBLIC_X_URL || "https://x.com/gamepredictt";
export const SOCIAL_X_HANDLE = "@gamepredictt";
