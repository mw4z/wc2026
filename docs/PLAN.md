# توقعات كأس العالم 2026 — Implementation Plan

## A. Product Requirements (PRD)

**Goal:** an internal workplace game where employees predict WC2026 match scores
before kickoff, earn points automatically after results are entered, and compete
on a leaderboard. Winner = highest total at tournament end.

**Users & roles**
- `USER` — predicts matches, views own predictions + leaderboard.
- `ADMIN` — manages matches/results/users, recalculates, exports.

**Core rules**
- One prediction per user per match; editable until kickoff; immutable after.
- Lock is enforced **server-side** (transaction re-checks clock + status).
- Other users' predictions are hidden until a match locks; then only aggregate
  outcome distribution (home/draw/away %) is shown.
- All timestamps stored in UTC; displayed in the user's local/configured TZ.

**Non-goals (MVP):** real-time score feeds, push notifications, payments, SSO
(Entra ID is a later swap of the auth module only).

## B. System Architecture

```
Browser (RTL, mobile-first)
   │  fetch (JSON) / form posts
   ▼
Next.js App Router on Vercel
   ├─ Server Components  → read data (Prisma)
   ├─ Route Handlers     → writes + admin ops (validated, authz'd)
   ├─ middleware.ts      → JWT cookie gate (edge), /admin role check
   └─ lib/ services      → scoring, predictions, leaderboard, csv (pure-ish)
   ▼
Prisma ORM → Neon PostgreSQL (pooled URL at runtime, direct URL for migrate)
```

- **No microservices.** All logic lives in `src/lib/*` and route handlers.
- **Source of truth for time** is the server clock inside DB transactions.
- **Stateless auth**: signed JWT in an httpOnly cookie (`jose`), verified at the
  edge in middleware and authoritatively (DB load) in route handlers.

## C. Database Schema (Prisma)

See `prisma/schema.prisma`. Models: `User`, `Team`, `Match`, `Prediction`,
`PredictionAuditLog`, `MatchResultAuditLog`, `LeaderboardEntry`, `Setting`.
Key constraints:
- `Prediction @@unique([userId, matchId])` — the anti-double-prediction guard.
- `User.employeeId @unique` — immutable identity.
- Indexes on `Match.status`, `Match.kickoffAt`, `LeaderboardEntry.rank`.
- `Match.homeScore/awayScore` = result **before** penalties; `winnerTeamId` =
  team that advanced (knockout, may differ on penalties); `wentToPenalties` flag.

## D. API Design (Route Handlers)

| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/login` | public | login or create by employee number |
| POST | `/api/auth/logout` | user | clear session |
| POST | `/api/predictions` | user | create/update own prediction (locked server-side) |
| POST | `/api/admin/import` | admin | import matches from CSV |
| POST | `/api/admin/matches/[id]/result` | admin | enter result → auto-score |
| POST | `/api/admin/recalculate` | admin | rescore one match `{matchId}` or full leaderboard |
| GET/PATCH | `/api/admin/settings` | admin | read/toggle registration |
| PATCH | `/api/admin/users/[id]` | admin | rename / activate / role |
| GET | `/api/admin/export?type=` | admin | leaderboard/predictions CSV |

Reads (matches, leaderboard, profile) are done in Server Components directly via
Prisma — no extra API layer needed.

## E. UI Route Structure

```
/login                      public login
/(app)/matches              today / upcoming / finished + predict
/(app)/leaderboard          ranked table, highlights you
/(app)/rules                scoring + tie-breaks
/(app)/profile              your info (employee# read-only) + stats
/(app)/dashboard            → redirect to /matches (MVP)
/(app)/admin                stats + import + recalc + registration + exports
/(app)/admin/matches        per-match result entry
/(app)/admin/users          rename / deactivate / role
```

## F. Scoring Algorithm

Pure function `calculatePredictionPoints` in `src/lib/scoring.ts`:
- Group: exact = 3, correct outcome = 1, else 0.
- Knockout: exact = 3 OR correct outcome = 1; **+1** if predicted qualifier
  matches actual `winnerTeamId`; clamp to 4. Outcome uses pre-penalty score.
- `calculateMatchPoints(matchId)` applies it to all predictions of a match
  (idempotent), flips status to `SCORED`, then `recalculateLeaderboard()`.

## G. Security & Anti-Cheat

1. **Server-side lock** — `lockPredictionGuard` runs inside the submit
   transaction, re-reading the match; defeats "open before, submit after".
2. **Unique constraint** `(userId, matchId)` — DB-level, not app-level.
3. **Audit logs** — every prediction change (`PredictionAuditLog`) and admin
   result change (`MatchResultAuditLog`, with admin id + before/after) recorded.
4. **No leakage** — others' predictions never returned before lock; only %
   distribution after lock (`getPredictionStatsAfterLock`).
5. **AuthZ** — middleware gates routes; handlers re-check `requireAdmin()`.
   Deactivated users rejected even with a valid cookie.
6. **Validation** — every write parsed with Zod; numbers clamped 0–99.
7. **Result/winner sanity** — non-draw score must match the chosen qualifier
   unless `wentToPenalties`.

## H. Deployment Plan

1. Create Neon project → copy pooled `DATABASE_URL` + direct `DIRECT_URL`.
2. Push repo to GitHub; import into Vercel.
3. Set env vars (`DATABASE_URL`, `DIRECT_URL`, `SESSION_SECRET`,
   `ADMIN_EMPLOYEE_IDS`, `NEXT_PUBLIC_DISPLAY_TZ`).
4. `npx prisma migrate deploy` (CI step or one-off) then `npm run db:seed`.
5. Build command `prisma generate && next build` (already in `package.json`).
6. Optional: a Vercel Cron hitting a small route to `lockDueMatches()` for tidy
   status display (predictions are already safe without it).

## I. MVP Development Checklist

- [x] Project config (Next, TS, Tailwind, Prisma)
- [x] Schema + enums + constraints + seed (48 teams, admin)
- [x] Auth: login/create by employee number, sessions, deactivation, reg toggle
- [x] Prediction service + server lock + audit + stats-after-lock
- [x] Scoring (pure) + per-match scoring + leaderboard rebuild
- [x] Match result entry + admin audit + result/winner sanity
- [x] CSV import (validate, upsert by match_number, TBD teams) + summary
- [x] CSV export (leaderboard, predictions)
- [x] UI: login, matches (+predict+countdown), leaderboard, rules, profile
- [x] Admin: dashboard, matches/results, users, settings, exports
- [ ] Full 104-match schedule CSV (currently opening fixtures only)
- [ ] Flag SVGs under `/public/flags`
- [x] Match detail page `/matches/[id]` with post-lock % distribution UI
- [ ] Tests for `scoring.ts` and `lockPredictionGuard`
- [ ] Entra ID auth swap (post-MVP)

## Edge cases & how they're handled

| Case | Handling |
|---|---|
| Submit after kickoff | Transaction guard rejects (`KICKOFF_REACHED`) |
| Page opened pre-kickoff, submitted after | Guard re-reads clock in the txn |
| Admin edits result after scoring | `updateMatchResult` re-scores idempotently + audits |
| Penalties | `wentToPenalties` + separate `winnerTeamId`; score stays pre-pen |
| Knockout draw with qualifier | Fully supported (score≠winner allowed w/ pens) |
| Duplicate registration | `employeeId` unique → existing account returned |
| Same display name | Names aren't unique; identity is employee number |
| Multiple admins editing | Each change audited with admin id + timestamp |
| Timezone mismatch | UTC in DB; `Intl` formats per `NEXT_PUBLIC_DISPLAY_TZ` |
| TBD teams | Nullable team FKs; prediction blocked until both set |
| Postponed / time change | Re-import updates `kickoffAt` (skips finished matches) |
```
