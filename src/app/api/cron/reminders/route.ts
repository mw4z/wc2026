import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPredictionLead, predictionOpensAt } from "@/lib/settings";
import { pushConfigured, sendPush, type StoredSubscription } from "@/lib/push";

// Hourly reminder cron. Sends ONE digest push per user for matches that are
// currently open for prediction, kick off within REMINDER_WINDOW_HOURS, and the
// user hasn't predicted yet — and only once per (user, match) (PushReminder dedupe).
//
// Triggered by Vercel Cron (see vercel.json) or any external scheduler. Protected
// by CRON_SECRET: Vercel automatically sends `Authorization: Bearer <CRON_SECRET>`;
// external schedulers can instead pass `?key=<CRON_SECRET>`.
export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // web-push needs Node crypto, not the edge runtime

const WINDOW_H = Number(process.env.REMINDER_WINDOW_HOURS || 6);

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // no secret configured → open (dev only)
  const auth = req.headers.get("authorization");
  const key = new URL(req.url).searchParams.get("key");
  return auth === `Bearer ${secret}` || key === secret;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!pushConfigured) {
    return NextResponse.json({ skipped: "push not configured" });
  }

  const now = new Date();
  const until = new Date(now.getTime() + WINDOW_H * 3600_000);
  const lead = await getPredictionLead();

  // Candidate matches: still open, teams known, kicking off inside the window.
  const matches = await prisma.match.findMany({
    where: {
      status: "SCHEDULED",
      kickoffAt: { gt: now, lte: until },
      homeTeamId: { not: null },
      awayTeamId: { not: null },
    },
    select: { id: true, kickoffAt: true },
  });
  // Respect the global prediction-open window — skip matches not open yet.
  const openMatches = matches.filter((m) => {
    const o = predictionOpensAt(m.kickoffAt, lead);
    return !o || o.getTime() <= now.getTime();
  });
  if (openMatches.length === 0) {
    return NextResponse.json({ usersNotified: 0, pushed: 0, reason: "no open matches in window" });
  }
  const matchIds = openMatches.map((m) => m.id);

  const subs = await prisma.pushSubscription.findMany();
  if (subs.length === 0) {
    return NextResponse.json({ usersNotified: 0, pushed: 0, reason: "no subscriptions" });
  }
  const userIds = [...new Set(subs.map((s) => s.userId))];

  const [preds, reminders] = await Promise.all([
    prisma.prediction.findMany({
      where: { userId: { in: userIds }, matchId: { in: matchIds } },
      select: { userId: true, matchId: true },
    }),
    prisma.pushReminder.findMany({
      where: { userId: { in: userIds }, matchId: { in: matchIds } },
      select: { userId: true, matchId: true },
    }),
  ]);
  const predSet = new Set(preds.map((p) => `${p.userId}:${p.matchId}`));
  const remSet = new Set(reminders.map((r) => `${r.userId}:${r.matchId}`));

  const subsByUser = new Map<string, StoredSubscription[]>();
  for (const s of subs) {
    const list = subsByUser.get(s.userId) ?? [];
    list.push({ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth });
    subsByUser.set(s.userId, list);
  }

  let usersNotified = 0;
  let pushed = 0;
  const reminderRows: { userId: string; matchId: string }[] = [];

  for (const userId of userIds) {
    const missing = openMatches.filter(
      (m) => !predSet.has(`${userId}:${m.id}`) && !remSet.has(`${userId}:${m.id}`),
    );
    if (missing.length === 0) continue;

    const n = missing.length;
    const payload = {
      title: "توقعات كأس 2026 ⚽",
      body:
        n === 1
          ? "مباراة تُغلق قريبًا ولم تتوقّع بعد. سجّل توقعك الآن!"
          : `${n} مباريات تُغلق قريبًا ولم تتوقّعها بعد. سجّل توقعاتك الآن!`,
      url: "/matches",
    };

    let delivered = false;
    for (const sub of subsByUser.get(userId)!) {
      if (await sendPush(sub, payload)) {
        delivered = true;
        pushed++;
      }
    }
    if (delivered) {
      usersNotified++;
      for (const m of missing) reminderRows.push({ userId, matchId: m.id });
    }
  }

  if (reminderRows.length > 0) {
    await prisma.pushReminder.createMany({ data: reminderRows, skipDuplicates: true });
  }

  return NextResponse.json({
    usersNotified,
    pushed,
    candidateMatches: openMatches.length,
    windowHours: WINDOW_H,
  });
}
