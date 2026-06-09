# Project Handoff / Context (read me first)

> New Claude Code session: read this file to get full context, then continue.

## What this is
Internal **FIFA World Cup 2026 prediction game** (Arabic, RTL). Employees log in,
predict match scores before kickoff (locks at kickoff), admins enter results,
points are auto-calculated, global + group leaderboards rank players.

## Stack & infra
- Next.js 15 (App Router) · TypeScript (strict) · Tailwind v3 · Prisma 6
- DB: **Supabase Postgres** (region `ap-south-1` / Mumbai)
- Hosting: **Vercel** — prod URL `https://wc2026-khaki-rho.vercel.app`, region `bom1`
- Repo: `https://github.com/mw4z/wc2026` (branch `master`)
- Auth: signed JWT in httpOnly cookie (`jose`); no password, no OTP yet

## Phases completed
1. **Core app** — schema, scoring (`src/lib/scoring.ts`), server-side prediction
   lock (`src/lib/predictions.ts`), leaderboard (`src/lib/leaderboard.ts`).
2. **Cloud** — Supabase + Vercel; DB initialized via SQL files in `supabase/`.
3. **Official schedule** — 104 fixtures (`prisma/schedule-data.ts`), KSA display
   (Asia/Riyadh), official FIFA venue names; `SAMPLE_DATA=false`.
4. **Groups (Phase D)** — `Group`/`GroupMember`, `CUP-XXXXX` codes, group
   leaderboards = filtered global `LeaderboardEntry` (predictions stay global).
5. **Phone login (Phase E)** — `User.phoneE164` (E.164) is the identity;
   `employeeId` kept nullable (legacy). libphonenumber-js validation; searchable
   country dropdown (`src/lib/countries.ts`, default SA). Phone never shown
   publicly (hidden from login response, leaderboard, group pages; admin-only).
6. **Visual identity** — colorful gradient backdrop, football/confetti wallpaper,
   stadium hero, original mascot (all in `/public/art`, license-safe SVG).

## DB migration model (IMPORTANT)
The DB was initialized by pasting SQL from `supabase/` into the Supabase SQL
Editor — there is **no `_prisma_migrations` history table**. So do **NOT** run
`prisma migrate deploy` (it would re-run from scratch and fail on existing
tables). To change schema: edit `schema.prisma`, then generate an incremental
SQL with `prisma migrate diff --from-schema-datamodel <old> --to-schema-datamodel
schema.prisma --script` and run it in the SQL Editor (see `supabase/*.sql` for
the pattern). `prisma generate` is always safe.

`supabase/` files: `01_schema.sql`, `02_seed.sql` (teams/admin/settings),
`10_schedule.sql` (104 matches + test cleanup), `20_groups.sql`, `30_phone_login.sql`.

## PENDING (do these)
1. Apply **`supabase/30_phone_login.sql`** (adds `phoneE164`, makes `employeeId`
   nullable) — required for phone login. *(check if already applied)*
2. **Reactivate admin:** `UPDATE "User" SET "isActive"=true WHERE "employeeId"='1001';`
3. Run verification: `npx tsx scripts/phone-e2e.ts <url>` and
   `npx tsx scripts/groups-e2e.ts <url>` (the latter's last 2 admin steps need an
   active admin).
4. **Rotate the Supabase DB password** (it was shared in chat) → update `.env` + Vercel.
5. Optional polish: add `TournamentHero` to `/leaderboard` and group dashboard;
   swap in licensed mascot/photos under `/public/art` if available.

## Run locally
```
npm install
# create .env (see .env.example: DATABASE_URL, DIRECT_URL, SESSION_SECRET,
#   NEXT_PUBLIC_DISPLAY_TZ=Asia/Riyadh, ADMIN_PHONE_NUMBERS, ADMIN_EMPLOYEE_IDS)
npx prisma generate
npm run dev           # http://localhost:3000
npm run typecheck && npm run lint && npm run build   # all must pass before pushing
```
Deploy = push to `master` (Vercel auto-builds). Build type-checks `scripts/` too,
so keep those clean.

## Hard constraints (do not change without being asked)
scoring logic · match schedule/data · prediction-lock logic · group logic ·
leaderboard tie-breakers · auth model. No OTP yet (keep code OTP-ready).

## Verification scripts (run against deployed URL or localhost)
`scripts/verify.ts` (pure logic), `scripts/e2e.ts` (core flow),
`scripts/groups-e2e.ts`, `scripts/phone-e2e.ts`, `scripts/diag.ts`.

## Web Push reminders
Browser/PWA push that nudges users to predict before kickoff. Hourly cron at
`/api/cron/reminders` (see `vercel.json`). Full setup, env vars, SQL, and the
Vercel-plan/cron caveat are in **docs/PUSH.md**. DB migration: `supabase/40_push.sql`.
