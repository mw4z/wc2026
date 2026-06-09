# Google AdSense setup (ads are OFF by default)

The app is **AdSense-ready but ads are disabled**. Nothing loads or renders until
you set `NEXT_PUBLIC_ENABLE_ADS="true"` **and** provide a client id. No script, no
ad containers, no layout shift while disabled.

## 1. Apply / add the site in AdSense
1. Sign in at https://adsense.google.com and add your site (the live domain).
2. AdSense gives you a **publisher id** like `ca-pub-1234567890123456`.
   - The "client id" used here is that full value (`ca-pub-...`).
   - The "pub" number (`pub-1234567890123456`) goes in `ads.txt`.

## 2. ads.txt
Edit `public/ads.txt` and replace the placeholder. If your client id is
`ca-pub-1234567890123456`, the file must read:

```
google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0
```

It will be served at `https://<your-domain>/ads.txt`.

## 3. Create ad units → get slot ids
In AdSense → **Ads → By ad unit → Display ads**, create one unit per placement and
copy each **slot id** (a number like `1234567890`). Recommended units:

| Env var | Where it shows in the app |
|---|---|
| `NEXT_PUBLIC_ADSENSE_MATCHES_TOP_SLOT` | `/matches` — top banner, under the page hero |
| `NEXT_PUBLIC_ADSENSE_LEADERBOARD_TOP_SLOT` | `/leaderboard` — top banner, under the hero |
| `NEXT_PUBLIC_ADSENSE_GROUP_TOP_SLOT` | `/groups/[id]` — banner below the group summary |
| `NEXT_PUBLIC_ADSENSE_RULES_BOTTOM_SLOT` | `/rules` — bottom banner, after the rules |
| `NEXT_PUBLIC_ADSENSE_FAQ_BOTTOM_SLOT` | `/faq` — bottom banner, after the FAQ |

A slot whose env var is empty simply renders **nothing**.

## 4. Set the env vars in Vercel
Vercel → project → **Settings → Environment Variables** (Production):

```
NEXT_PUBLIC_ENABLE_ADS=true
NEXT_PUBLIC_ADSENSE_CLIENT_ID=ca-pub-1234567890123456
NEXT_PUBLIC_ADSENSE_MATCHES_TOP_SLOT=1234567890
NEXT_PUBLIC_ADSENSE_LEADERBOARD_TOP_SLOT=...
NEXT_PUBLIC_ADSENSE_GROUP_TOP_SLOT=...
NEXT_PUBLIC_ADSENSE_RULES_BOTTOM_SLOT=...
NEXT_PUBLIC_ADSENSE_FAQ_BOTTOM_SLOT=...
NEXT_PUBLIC_CONTACT_EMAIL=support@yourdomain.com
```

These are `NEXT_PUBLIC_*` (inlined at build), so **redeploy** after changing them
(Vercel → Deployments → Redeploy, or push a commit).

## 5. Enable & verify
- Open the site; the AdSense script now loads on every page.
- Ad units appear in the 5 placements above (labelled **إعلان**).
- To turn ads back off: set `NEXT_PUBLIC_ENABLE_ADS=false` and redeploy.

## Policy notes (keep us compliant)
- **Never** encourage clicks (no "اضغط على الإعلان", arrows, etc.).
- **No** ads inside or next to prediction controls (score inputs / submit button).
- **No** popups, sticky bars, interstitials, or autoplay video ads.
- Keep **/privacy** and **/terms** public and accurate (they mention ad cookies).
- **Phone numbers are never public** and never passed to ad code.
- Don't claim official FIFA affiliation.
