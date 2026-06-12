# Open Graph / link previews

When a GamePredict link is shared in WhatsApp / X / etc., it shows a branded
preview (title + description + 1200×630 image) instead of a bare URL.

Canonical origin: **https://www.gamepredict.net** (override with `NEXT_PUBLIC_SITE_URL`).

## What's implemented

| Page | Title / description | OG image |
| --- | --- | --- |
| `/` (home) | "GamePredict — توقعات المباريات" + value-prop | `/og-default.png` |
| `/join/[code]` | Dynamic: group name + code (or generic fallback) | `/og-join.png` |

- Metadata lives in `src/app/layout.tsx` (defaults + `metadataBase`),
  `src/app/(public)/page.tsx` (home), and `src/app/join/[code]/page.tsx`
  (`generateMetadata`, fetches the group name by code).
- OG images are static PNGs in `public/` (1200×630), generated from
  `public/art/og-*-source.svg` via `sharp` (Arabic renders correctly).
- Join links: the middleware lets known link-preview crawlers reach
  `/join/[code]` (instead of redirecting to `/login`) so they read the OG tags;
  the page renders a public invite landing for them. Humans still get the
  invite-cookie → login flow unchanged.

## Regenerating the OG images

```bash
node -e "const s=require('sharp'),fs=require('fs');\
Promise.all([\
 s(fs.readFileSync('public/art/og-default-source.svg'),{density:160}).resize(1200,630).png().toFile('public/og-default.png'),\
 s(fs.readFileSync('public/art/og-join-source.svg'),{density:160}).resize(1200,630).png().toFile('public/og-join.png'),\
]).then(()=>console.log('ok'))"
```

## URLs to test (after deploy)

- Home: `https://www.gamepredict.net/`
- Join: `https://www.gamepredict.net/join/CUP-XXXXX` (use a real group code)
- Image: `https://www.gamepredict.net/og-default.png` and `/og-join.png`
  → must return **200** with `Content-Type: image/png`, **no login**, 1200×630.

## How to test

- **Facebook Sharing Debugger** — https://developers.facebook.com/tools/debug/
  Paste the URL → "Scrape Again" to refresh. Shows the exact og:* tags it sees.
- **X/Twitter** — paste the link into a draft tweet (or the Card Validator if you
  have access). `summary_large_image` card.
- **WhatsApp** — send the link to yourself / a test chat. The preview appears
  after a moment.
- **Raw check** — `curl -A "facebookexternalhit/1.1" https://www.gamepredict.net/join/CUP-XXXXX`
  and confirm the `<meta property="og:*">` / `twitter:*` tags are present
  (crawler UA so /join isn't redirected).

## Caching note

WhatsApp, X, and Facebook **cache** previews aggressively. After changing copy
or images:
- Use the Facebook **Sharing Debugger → Scrape Again** to force a refresh.
- For WhatsApp, append a throwaway query param to bust its cache while testing,
  e.g. `…/join/CUP-12345?v=2` (the app ignores unknown params).
- It can take time for caches to expire naturally.
