# Web Push reminders — setup & operations

Reminds users to submit predictions before kickoff via browser/PWA push
notifications. No phone numbers, no third‑party messaging — standard Web Push
(VAPID). Works on Android Chrome, desktop Chrome/Edge/Firefox, and iOS Safari
**only when the site is installed to the Home Screen** (iOS 16.4+).

## How it works

1. On `/matches`, `ReminderToggle` asks for notification permission, registers
   `/sw.js`, subscribes via the Push API, and POSTs the subscription to
   `/api/push/subscribe` (stored in `PushSubscription`).
2. An hourly Vercel Cron hits `/api/cron/reminders`. For every match that is
   open for prediction and kicks off within `REMINDER_WINDOW_HOURS` (default 6),
   it finds subscribed users with no prediction yet and sends **one digest push**
   ("N matches close soon"). It records each (user, match) in `PushReminder` so a
   user is nudged **at most once per match** — never spammy.
3. `public/sw.js` shows the notification and, on click, focuses/opens `/matches`.

## Required environment variables (Vercel → Project → Settings → Environment Variables)

Set these for **Production** (and Preview if you test there). They are already in
the local `.env` for dev.

| Variable | Value | Notes |
|---|---|---|
| `VAPID_PUBLIC_KEY` | `BMzw4lYp8cA94uGZAXVQsu7lM7mJdkaGI-y4j-D5jliQNdaUe_YfW36ZdXxVqSk2iQewyvlOTKnb1XotFRRety0` | server |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | same public key as above | exposed to the browser |
| `VAPID_PRIVATE_KEY` | `akj7AsSLze-FiVgqdprQspblPBNkktBeQFxobPKQFg0` | **secret** — never commit/share |
| `VAPID_SUBJECT` | `mailto:moayad.1420@gmail.com` | contact URI required by push services |
| `CRON_SECRET` | `Ie_h7oZKnxxJf8Qz6m_ZtGm3gPLpm_IY` | protects the cron endpoint |
| `REMINDER_WINDOW_HOURS` | `6` | optional; how far ahead of kickoff to remind |

> Regenerate keys anytime with `npx web-push generate-vapid-keys --json`.
> If you change the VAPID keys, existing subscriptions stop working and users
> must re‑enable reminders.

## Database

Paste **`supabase/40_push.sql`** into the Supabase SQL Editor once (creates
`PushSubscription` + `PushReminder`). This project migrates via the SQL Editor,
not `prisma migrate deploy`.

## Cron

`vercel.json` declares an hourly cron: `"0 * * * *" → /api/cron/reminders`.

**Plan caveat:** Vercel **Hobby** runs crons at most **once per day** — too coarse
for kickoff reminders. To get hourly reminders you need **Vercel Pro**, *or* use a
free external scheduler (e.g. cron-job.org, EasyCron) hitting:

```
https://www.gamepredict.net/api/cron/reminders?key=Ie_h7oZKnxxJf8Qz6m_ZtGm3gPLpm_IY
```

(Vercel Cron authenticates automatically via the `Authorization: Bearer
$CRON_SECRET` header; external schedulers use the `?key=` query param instead.)

## Manual test

```
# should return JSON like {"usersNotified":0,"pushed":0,...}
curl "https://www.gamepredict.net/api/cron/reminders?key=Ie_h7oZKnxxJf8Qz6m_ZtGm3gPLpm_IY"
```

End‑to‑end: open `/matches` on a phone/desktop → "تفعيل التذكيرات" → grant
permission → leave at least one of today's matches unpredicted within 6h of
kickoff → trigger the cron → you should receive a notification.

## Notes / limits

- iOS: must be added to Home Screen first; the toggle shows a hint otherwise.
- Reminders are Arabic (the product is Arabic‑first); locale isn't stored per
  subscription.
- Expired subscriptions (HTTP 404/410) are auto‑pruned when a send fails.
