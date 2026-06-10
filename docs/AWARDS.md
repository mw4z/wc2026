# Tournament Awards

Optional, leader-toggled predictions for the World Cup individual awards
(Golden Ball, Golden Boot, Golden Glove, Best Young Player). **Completely
separate** from match predictions — own picks, own per-group board, fixed
**3 points per correct pick**. Never affects the match leaderboard.

## Data model
- `Award` (seeded: 4 awards) → `AwardCandidate` (admin-entered) → `AwardPrediction`
  (one per user per award, GLOBAL).
- `Group.awardsEnabled` — per-group visibility toggle (leader-controlled).
- Migration: **`supabase/70_awards.sql`** (creates tables + `awardsEnabled`, seeds the 4 awards).

## Locking
Award picks lock at **tournament start** = the earliest match kickoff, OR a
Setting `awards_lock_at` (ISO datetime) if an admin inserts one. Enforced
server-side in `submitAwardPrediction`.

## Setup (admin)
1. Run `supabase/70_awards.sql` in Supabase.
2. Admin → **إدارة الجوائز** (`/admin/awards`): for each award, **add candidates**
   (Arabic + English name, optional team). Do this **before the lock** so members
   can pick.
3. After the final: pick the **winner** from the dropdown per award and Save →
   all predictions are scored automatically (3 pts each correct). Re-selecting a
   different winner re-scores (manual correction). "Clear winner" un-scores.

## Leader
On the group page, the leader sees **تفعيل توقعات الجوائز** to enable/disable
awards for that group. When enabled, members see the predict + board links.

## Member
- `/awards` — pick one candidate per award from a dropdown (auto-saves). After
  lock it's read-only; after winners are set it shows correct/points.
- Gated: only visible if the member is in ≥1 group with `awardsEnabled`.

## Board
`/groups/[id]/awards` — **ترتيب جوائز البطولة**, a separate standings (points,
ranked), clearly marked as separate from the match leaderboard.

## Scope (v1, intentionally simple)
No free text, no fuzzy matching, no player DB/API, no images, no per-group
candidate lists, no nomination workflow. Award points never mix with match points.
