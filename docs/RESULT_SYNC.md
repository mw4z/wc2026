# Auto Results Sync

Automatically pulls **final** match results from a trusted football provider
(API-Football / API-Sports) and scores predictions through the **existing**
scoring path — no manual admin entry required after every match.

Manual admin result entry is **unchanged** and remains the fallback + override.
Nothing about prediction submission, locking, scoring rules, leaderboard, groups,
auth, ads, WhatsApp links, or push opt-in is modified by this phase.

---

## 1. Provider setup

1. Create an account at **https://www.api-football.com/** (or API-Sports). The
   free plan works but is rate-limited (~100 requests/day) — fine for hourly sync.
2. Copy your API key.
3. Confirm the **league id** and **season** for the 2026 World Cup in the
   provider dashboard. The defaults here assume `league=1`, `season=2026` — verify
   and adjust if the provider uses different ids.

## 2. Required env vars

Set these in **Vercel → Settings → Environment Variables** (Production) and in
local `.env`. **None are `NEXT_PUBLIC`** — they stay server-only.

| Variable | Example | Notes |
|---|---|---|
| `FOOTBALL_API_PROVIDER` | `api-football` | label only |
| `FOOTBALL_API_KEY` | `your-key` | **secret** |
| `FOOTBALL_API_BASE_URL` | `https://v3.football.api-sports.io` | direct API-Sports host (uses `x-apisports-key` header) |
| `FOOTBALL_API_WORLD_CUP_LEAGUE_ID` | `1` | verify in provider |
| `FOOTBALL_API_WORLD_CUP_SEASON` | `2026` | verify in provider |
| `RESULT_SYNC_SECRET` | `K31sGVdK1caGOLeFkpOXOFiBDeWwVG2x` | protects the sync endpoint |

> If `FOOTBALL_API_KEY` is empty, the sync is a safe no-op (`skipped: provider not configured`).

## 3. Database migration

Paste **`supabase/60_result_sync.sql`** into the Supabase SQL Editor once. It adds
to `Match`: `externalProvider`, `externalFixtureId`, `resultSource`,
`lastSyncedAt`, `externalStatus`, `needsReview` (+ an index). Existing match ids
are untouched. The SQL uses `IF NOT EXISTS`, so it's safe to re-run.

## 4. Map our matches to provider fixtures

Each match needs an `externalFixtureId` before it can sync.

```bash
# Dry run — prints mapped / ambiguous / unmapped, writes nothing:
npx tsx --env-file=.env scripts/map-fixtures.ts

# Apply the confident mappings to the DB:
npx tsx --env-file=.env scripts/map-fixtures.ts --apply
```

Matching is by **kickoff time (±3h), home team, away team** (with a name-alias
table), and only the **same home/away orientation**. Rules:
- exactly one same-orientation candidate → **mapped**
- multiple candidates, or only a reversed-orientation candidate → **ambiguous**, never auto-applied
- knockout matches with TBD teams → **unmapped** until the bracket resolves; re-run later

Review the report. Add missing name variants to `TEAM_ALIASES` in
`src/lib/fixtureMapping.ts` if a known team didn't match, and re-run.

## 5. Run the sync

### Manually (sanity check)
```bash
curl "https://www.gamepredict.net/api/cron/sync-results?key=RESULT_SYNC_SECRET"
# or
curl -H "Authorization: Bearer RESULT_SYNC_SECRET" https://www.gamepredict.net/api/cron/sync-results
```
Returns a JSON report: `{ checked, scored, review, skipped, missingFromProvider, errors, rateLimitRemaining }`.

### Scheduled
`vercel.json` already declares an hourly cron (`/api/cron/sync-results`).
- **Vercel Pro:** can run every 15 min on matchdays — change the schedule to `*/15 * * * *`.
- **Vercel Hobby:** crons only run once/day. Use a free external scheduler
  (cron-job.org) hitting the URL above with the `Authorization: Bearer` header,
  every 15 min on matchdays (hourly is acceptable).

Vercel's built-in cron authenticates with `CRON_SECRET`; the route accepts either
`CRON_SECRET` or `RESULT_SYNC_SECRET`, so both Vercel cron and external schedulers work.

## 6. How knockout penalties are handled

- The stored `homeScore`/`awayScore` are the score **before penalties** (provider
  `goals`, which excludes the shootout). A tie before penalties stays a **draw**
  for exact-score / outcome scoring.
- `wentToPenalties` is set when the provider status is `PEN` or a penalty score exists.
- The **qualified team** is taken from the provider's winner flag and stored in
  `winnerTeamId` (scored separately, +1).
- If the provider does **not** clearly mark a winner, the match is set to
  `needsReview` with the score stored but **not scored** — an admin confirms the
  qualifier. We never guess.

## 7. Admin review & manual override

Admin → Manage matches shows per match: **result source** (manual / auto),
**provider fixture id**, **provider status**, **last synced**, and a
**needs-review** badge when applicable. A **"Sync now"** button force re-pulls a
single match (even if already scored).

To override, just enter the result in the existing form and save. That:
- updates the result, re-runs scoring (existing path), writes an audit row,
- sets `resultSource = manual` and clears `needsReview`.

## 8. Safety guarantees

- Never scores before provider status is final (`FT` / `AET` / `PEN`).
- Never derives a result from a live/in-progress score.
- Never guesses a knockout qualifier — unclear → `needsReview`.
- Already-`SCORED` matches are skipped (no double scoring); admin force is the only re-score path.
- Provider/network failures are logged and reported, never thrown to users.
- Requests are batched (≤20 ids/call) and capped (≤60 matches/run) to respect quota.

## 9. Tests

```bash
npx tsx scripts/result-sync-test.ts   # 33 pure assertions, no DB/network
```
Covers: provider parsing, group-stage scoring, knockout tied-before-penalties +
qualifier, "never score before final", unclear-qualifier → review, and that
ambiguous mappings are never auto-applied.

## 10. Failure modes

| Symptom | Cause / fix |
|---|---|
| `skipped: provider not configured` | `FOOTBALL_API_KEY` not set |
| `401` from the endpoint | wrong/missing `RESULT_SYNC_SECRET` (or `CRON_SECRET` for Vercel cron) |
| `missingFromProvider` high | wrong league/season id, or matches not mapped |
| match stuck on `needsReview` | provider didn't mark a knockout winner — confirm via admin form |
| `rateLimitRemaining` near 0 | provider quota — reduce frequency or upgrade plan |
| mapping shows ambiguous | add a team alias or confirm the fixture manually before mapping |
