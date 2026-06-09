import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPredictionLead, predictionOpensAt } from "@/lib/settings";
import { pushConfigured, sendPush, type StoredSubscription, type PushPayload } from "@/lib/push";
import { openedPayload, closingPayload, scoredPayload } from "@/lib/notifications";

// Hourly reminder cron. Fires THREE kinds of push, each deduped per (user,
// match, kind) via PushReminder so nothing repeats:
//   • "open"    — a match just became available to predict (lead-time window).
//   • "closing" — an open match the user hasn't predicted kicks off soon.
//   • "scored"  — a match the user predicted now has a result + points.
//
// Protected by CRON_SECRET (Vercel sends `Authorization: Bearer <secret>`;
// external schedulers can pass `?key=<secret>`).
export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // web-push needs Node crypto, not the edge runtime

const WINDOW_H = Number(process.env.REMINDER_WINDOW_HOURS || 6); // "closing soon" window
const OPEN_LOOKBACK_H = Number(process.env.REMINDER_OPEN_LOOKBACK_HOURS || 24);
const SCORED_LOOKBACK_H = Number(process.env.REMINDER_SCORED_LOOKBACK_HOURS || 24);

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // no secret configured → open (dev only)
  const auth = req.headers.get("authorization");
  const key = new URL(req.url).searchParams.get("key");
  return auth === `Bearer ${secret}` || key === secret;
}

const tn = (t: { nameAr: string } | null) => t?.nameAr ?? "—";

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!pushConfigured) return NextResponse.json({ skipped: "push not configured" });

  const now = new Date();
  const nowMs = now.getTime();
  const lead = await getPredictionLead();

  const subs = await prisma.pushSubscription.findMany();
  if (subs.length === 0) return NextResponse.json({ reason: "no subscriptions", open: 0, closing: 0, scored: 0 });
  const userIds = [...new Set(subs.map((s) => s.userId))];
  const subsByUser = new Map<string, StoredSubscription[]>();
  for (const s of subs) {
    const list = subsByUser.get(s.userId) ?? [];
    list.push({ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth });
    subsByUser.set(s.userId, list);
  }

  // --- Candidate matches -----------------------------------------------------
  const scheduled = await prisma.match.findMany({
    where: { status: "SCHEDULED", kickoffAt: { gt: now }, homeTeamId: { not: null }, awayTeamId: { not: null } },
    select: { id: true, kickoffAt: true },
  });
  const openMatches: typeof scheduled = []; // just opened
  const closingMatches: typeof scheduled = []; // open + kicking off soon
  for (const m of scheduled) {
    const opensAt = predictionOpensAt(m.kickoffAt, lead);
    const isOpen = !opensAt || opensAt.getTime() <= nowMs;
    if (!isOpen) continue;
    const justOpened = opensAt != null && opensAt.getTime() > nowMs - OPEN_LOOKBACK_H * 3600_000;
    if (justOpened) openMatches.push(m);
    else if (m.kickoffAt.getTime() <= nowMs + WINDOW_H * 3600_000) closingMatches.push(m);
  }

  const scoredMatches = await prisma.match.findMany({
    where: {
      status: "SCORED",
      homeScore: { not: null },
      awayScore: { not: null },
      updatedAt: { gte: new Date(nowMs - SCORED_LOOKBACK_H * 3600_000) },
    },
    select: { id: true, homeScore: true, awayScore: true, homeTeam: true, awayTeam: true },
  });

  const allMatchIds = [
    ...openMatches.map((m) => m.id),
    ...closingMatches.map((m) => m.id),
    ...scoredMatches.map((m) => m.id),
  ];
  if (allMatchIds.length === 0) return NextResponse.json({ reason: "nothing to notify", open: 0, closing: 0, scored: 0 });

  // Predictions (for "already predicted" checks + scored points) and prior reminders.
  const [preds, reminders] = await Promise.all([
    prisma.prediction.findMany({
      where: { userId: { in: userIds }, matchId: { in: allMatchIds } },
      select: { userId: true, matchId: true, pointsAwarded: true },
    }),
    prisma.pushReminder.findMany({
      where: { userId: { in: userIds }, matchId: { in: allMatchIds } },
      select: { userId: true, matchId: true, kind: true },
    }),
  ]);
  const predBy = new Map(preds.map((p) => [`${p.userId}:${p.matchId}`, p]));
  const remSet = new Set(reminders.map((r) => `${r.userId}:${r.matchId}:${r.kind}`));

  let pushed = 0;
  const counts = { open: 0, closing: 0, scored: 0 };
  const reminderRows: { userId: string; matchId: string; kind: string }[] = [];

  async function deliver(userId: string, payload: PushPayload): Promise<boolean> {
    let ok = false;
    for (const sub of subsByUser.get(userId)!) if (await sendPush(sub, payload)) ok = true;
    if (ok) pushed++;
    return ok;
  }

  for (const userId of userIds) {
    const predicted = (mId: string) => predBy.has(`${userId}:${mId}`);
    const reminded = (mId: string, kind: string) => remSet.has(`${userId}:${mId}:${kind}`);

    // 1) Predictions just opened (digest)
    const opened = openMatches.filter((m) => !predicted(m.id) && !reminded(m.id, "open"));
    if (opened.length) {
      const ok = await deliver(userId, openedPayload(opened.length));
      if (ok) {
        counts.open++;
        for (const m of opened) reminderRows.push({ userId, matchId: m.id, kind: "open" });
      }
    }

    // 2) Closing soon, not predicted (digest)
    const closing = closingMatches.filter((m) => !predicted(m.id) && !reminded(m.id, "closing"));
    if (closing.length) {
      const ok = await deliver(userId, closingPayload(closing.length));
      if (ok) {
        counts.closing++;
        for (const m of closing) reminderRows.push({ userId, matchId: m.id, kind: "closing" });
      }
    }

    // 3) Scored — only to users who predicted, personalized with their points.
    for (const m of scoredMatches) {
      const pred = predBy.get(`${userId}:${m.id}`);
      if (!pred || reminded(m.id, "scored")) continue;
      const pts = pred.pointsAwarded ?? 0;
      const line = `${tn(m.homeTeam)} ${m.homeScore}-${m.awayScore} ${tn(m.awayTeam)} ⚽`;
      const ok = await deliver(userId, scoredPayload({ line, points: pts, matchId: m.id }));
      if (ok) {
        counts.scored++;
        reminderRows.push({ userId, matchId: m.id, kind: "scored" });
      }
    }
  }

  if (reminderRows.length) {
    await prisma.pushReminder.createMany({ data: reminderRows, skipDuplicates: true });
  }

  return NextResponse.json({
    pushed,
    ...counts,
    candidates: { open: openMatches.length, closing: closingMatches.length, scored: scoredMatches.length },
  });
}
