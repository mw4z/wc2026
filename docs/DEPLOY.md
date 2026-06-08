# Phase 2 — Deploy to Vercel + initialize Supabase (cloud-first)

Because the corporate network blocks outbound Postgres ports (5432/6543), the
database is initialized via the **Supabase SQL Editor** (HTTPS) and the app runs
on **Vercel** (open egress). E2E runs from your laptop against the Vercel URL
over HTTPS (port 443, allowed).

> Do **not** commit `.env`. Do **not** paste secrets into the repo. Generate a
> fresh `SESSION_SECRET` for production (don't reuse the local one).

---

## Step 1 — Initialize the database (Supabase SQL Editor)

1. Supabase dashboard → your project → **SQL Editor** → **New query**.
2. Open `supabase/01_schema.sql`, copy all, paste, **Run**. (Creates 4 enums + 8 tables + indexes + FKs.)
3. Open `supabase/02_seed.sql`, copy all, paste, **Run**. (48 teams + TBD, admin `1001`, `registration_open`, 10 sample matches + 1 lock-test match.)
4. Open `supabase/03_verify.sql`, run sections **A–C** → confirm 8 tables and the counts (Team=49, Setting=1, Match=11, admin present).

## Step 2 — Push the repo to GitHub

The repo is already committed locally. Create an empty GitHub repo (no README), then:

```bash
git remote add origin https://github.com/<you>/wc2026-predictions.git
git push -u origin master
```

(Needs your GitHub auth — do this from your terminal with the `!` prefix, e.g. `! git push -u origin master`.)

## Step 3 — Deploy on Vercel

1. https://vercel.com → **Add New → Project** → import the GitHub repo.
2. Framework preset: **Next.js** (auto-detected). Leave build/install commands default — `npm run build` already runs `prisma generate`.
3. **Environment Variables** (Production + Preview):

| Name | Value |
|---|---|
| `DATABASE_URL` | the Supabase **transaction pooler** URL (port 6543, ends with `?pgbouncer=true`) |
| `DIRECT_URL` | the Supabase **session pooler** URL (port 5432) |
| `SESSION_SECRET` | a fresh 32+ char secret — generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `NEXT_PUBLIC_DISPLAY_TZ` | `Asia/Riyadh` |
| `ADMIN_EMPLOYEE_IDS` | `1001` |

4. **Deploy**. Wait for the build to finish; copy the `https://<app>.vercel.app` URL.

> Note: we initialize the DB via SQL (Step 1), so Vercel does **not** run
> migrations. `DIRECT_URL` is still set for parity / future `prisma migrate`.

## Step 4 — Run the end-to-end test (from your laptop)

```bash
npx tsx scripts/e2e.ts https://<app>.vercel.app
```

This hits the live app over HTTPS and checks: new-user creation, prediction on
an open match, **server-side rejection** on the past match, admin login, result
entry + auto-scoring (+3 pts), points shown on `/matches`, and the leaderboard
rebuild. Then run `supabase/03_verify.sql` sections **D** for row-level evidence
(Prediction, audit logs, LeaderboardEntry).

*(Or paste me the URL and I'll run `scripts/e2e.ts` and report the output.)*

## Step 5 — Cleanup / hardening

- Remove the lock-test fixture: `DELETE FROM "Match" WHERE "matchNumber" = 101;` (section E).
- **Rotate the Supabase DB password** (Project Settings → Database) — it was shared during setup — then update `DATABASE_URL`/`DIRECT_URL` in Vercel.
- Full 104-match schedule import is a later phase (not now).
