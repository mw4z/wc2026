# توقعات كأس العالم 2026 — Internal Prediction Game

Next.js (App Router) + TypeScript + Prisma + PostgreSQL (Neon). Arabic RTL UI,
dark-navy/gold theme. Deployed on Vercel.

## Local setup

```bash
npm install
cp .env.example .env          # fill DATABASE_URL, DIRECT_URL, SESSION_SECRET
npm run prisma:generate
npm run prisma:migrate        # creates tables
npm run db:seed               # 48 teams + admin (employeeId 1001)
npm run dev
```

Open http://localhost:3000 — log in with name + employee number. Employee `1001`
is the bootstrap admin (configurable via `ADMIN_EMPLOYEE_IDS`).

## How it works

- **Auth**: name + employee number, no password. Employee number is the unique,
  immutable identity. Existing number → login (name never overwritten). New
  number → user created (if registration open). Session = signed httpOnly cookie.
- **Predictions**: one per user per match (DB unique constraint). Create/update
  allowed only while `status = SCHEDULED` AND server time < kickoff. Enforced in
  a transaction in `src/lib/predictions.ts` — frontend countdown is cosmetic.
- **Scoring** (`src/lib/scoring.ts`, pure): group 3/1/0; knockout 3/1 + 1 for
  qualifier (max 4). Score judged pre-penalties; qualifier tracked separately.
- **Leaderboard** (`src/lib/leaderboard.ts`): denormalized table rebuilt after
  any scoring change. Tie-breaks: points → exact → outcomes → earliest pred.
- **Admin**: import matches (CSV), enter results (auto-scores), recalc, manage
  users (rename / deactivate / role), toggle new-user registration, export CSV.
- **Audit**: every prediction change and every admin result change is logged.

## Importing the full schedule

Edit `data/matches.sample.csv` (UTC, ISO 8601) and paste into Admin → Import, or
POST it to `/api/admin/import`. Columns: `match_number, stage, home_team_code,
away_team_code, kickoff_at, city, stadium`. Use `TBD` for undecided teams.

> The sample CSV contains the opening fixtures. Source times in the schedule PDF
> are Mecca time (UTC+3); convert to UTC (subtract 3h) before importing.

See `docs/PLAN.md` for the full PRD, architecture, API, and checklist.
