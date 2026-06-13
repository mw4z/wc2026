import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pushConfigured, sendPush, type StoredSubscription } from "@/lib/push";
import { isGroupLeader } from "@/lib/groups";
import { getPredictionLead, predictionOpensAt } from "@/lib/settings";
import { errorResponse } from "@/lib/api";

export const runtime = "nodejs";

// Leader (or admin) nudges group members who haven't predicted the open upcoming
// matches yet, via Web Push. Opt-in only (members who enabled reminders). Deduped
// per (user, nearest match) so repeated clicks don't spam. No phone numbers.
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;

    const group = await prisma.group.findUnique({ where: { id } });
    if (!group || !group.isActive) {
      return NextResponse.json({ error: "المجموعة غير موجودة", code: "GROUP_NOT_FOUND" }, { status: 404 });
    }
    const isLeader = await isGroupLeader(user.id, id);
    if (!isLeader && user.role !== "ADMIN") {
      return NextResponse.json({ error: "هذا الإجراء لقائد المجموعة فقط", code: "NOT_LEADER" }, { status: 403 });
    }
    if (!pushConfigured) {
      return NextResponse.json({ ok: false, reason: "push not configured", notified: 0 });
    }

    const now = new Date();
    const lead = await getPredictionLead();

    // Open upcoming matches: scheduled, teams known, kickoff ahead, window open.
    const scheduled = await prisma.match.findMany({
      where: { status: "SCHEDULED", homeTeamId: { not: null }, awayTeamId: { not: null }, kickoffAt: { gt: now } },
      select: { id: true, kickoffAt: true },
      orderBy: { kickoffAt: "asc" },
    });
    const open = scheduled.filter((m) => {
      const o = predictionOpensAt(m.kickoffAt, lead);
      return !o || o.getTime() <= now.getTime();
    });
    if (open.length === 0) {
      return NextResponse.json({ ok: true, notified: 0, reason: "no open matches" });
    }
    const openIds = open.map((m) => m.id);
    const nearest = open[0]!.id; // dedupe anchor

    const members = await prisma.groupMember.findMany({ where: { groupId: id }, select: { userId: true } });
    const memberIds = members.map((m) => m.userId);

    const preds = await prisma.prediction.findMany({
      where: { userId: { in: memberIds }, matchId: { in: openIds } },
      select: { userId: true, matchId: true },
    });
    const predCount = new Map<string, number>();
    for (const p of preds) predCount.set(p.userId, (predCount.get(p.userId) ?? 0) + 1);

    // Missing = at least one open match unpredicted. Never nudge the leader themself.
    const missing = memberIds.filter((uid) => uid !== user.id && (predCount.get(uid) ?? 0) < openIds.length);
    if (missing.length === 0) {
      return NextResponse.json({ ok: true, notified: 0, reason: "everyone predicted" });
    }

    const [subs, already] = await Promise.all([
      prisma.pushSubscription.findMany({ where: { userId: { in: missing } } }),
      prisma.pushReminder.findMany({ where: { userId: { in: missing }, matchId: nearest, kind: "nudge" }, select: { userId: true } }),
    ]);
    const alreadySet = new Set(already.map((r) => r.userId));
    const subsByUser = new Map<string, StoredSubscription[]>();
    for (const s of subs) {
      const list = subsByUser.get(s.userId) ?? [];
      list.push({ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth });
      subsByUser.set(s.userId, list);
    }

    const payload = {
      title: "📣 تذكير من قائد مجموعتك",
      body: `لا تنسَ تسجيل توقعاتك في «${group.name}» قبل بداية المباريات! ⚽`,
      url: "/matches",
      tag: `wc26-nudge-${id}`,
    };

    let notified = 0;
    const recorded: { userId: string; matchId: string; kind: string }[] = [];
    for (const uid of missing) {
      if (alreadySet.has(uid)) continue;
      const list = subsByUser.get(uid);
      if (!list || list.length === 0) continue; // no push enabled
      let delivered = false;
      for (const sub of list) if (await sendPush(sub, payload)) delivered = true;
      if (delivered) {
        notified++;
        recorded.push({ userId: uid, matchId: nearest, kind: "nudge" });
      }
    }
    if (recorded.length) await prisma.pushReminder.createMany({ data: recorded, skipDuplicates: true });

    return NextResponse.json({
      ok: true,
      notified,
      missing: missing.length,
      withoutPush: missing.filter((u) => !(subsByUser.get(u)?.length)).length,
      alreadyNudged: missing.filter((u) => alreadySet.has(u)).length,
    });
  } catch (e) {
    return errorResponse(e);
  }
}
