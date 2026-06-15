import { prisma } from "./prisma";
import { pushConfigured, sendPush, type PushPayload, type StoredSubscription } from "./push";
import { playerDisplayName } from "./playerNames";

// Single source of truth for reminder copy, shared by the cron (real reminders)
// and the admin "send test" tool (sample previews). Arabic, sporty, with emoji.

// Notify ALL active admins (super admins) that a new user just registered.
// Fire-and-forget friendly: never throws, no-ops if push isn't configured or no
// admin has enabled notifications. (No tag → each new signup shows separately.)
export function newUserPayload(name: string): PushPayload {
  return {
    title: "🆕 مستخدم جديد في GamePredict",
    body: `${name} أنشأ حسابًا جديدًا للتو.`,
    url: "/admin/users",
  };
}

// Immediately push the "scored" notification to every user who predicted this
// match (personalized with their points), the moment results are calculated —
// rather than waiting for the hourly reminder cron. Deduped via PushReminder
// (kind="scored"), so the cron never sends a duplicate. Never throws.
export async function notifyMatchScored(matchId: string): Promise<number> {
  if (!pushConfigured) return 0;
  try {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: { homeTeam: true, awayTeam: true },
    });
    if (!match || match.homeScore == null || match.awayScore == null) return 0;

    const preds = await prisma.prediction.findMany({
      where: { matchId },
      select: { userId: true, pointsAwarded: true },
    });
    if (preds.length === 0) return 0;
    const userIds = preds.map((p) => p.userId);

    const [subs, already] = await Promise.all([
      prisma.pushSubscription.findMany({ where: { userId: { in: userIds } } }),
      prisma.pushReminder.findMany({
        where: { matchId, kind: "scored", userId: { in: userIds } },
        select: { userId: true },
      }),
    ]);
    if (subs.length === 0) return 0;

    const alreadySet = new Set(already.map((r) => r.userId));
    const subsByUser = new Map<string, StoredSubscription[]>();
    for (const s of subs) {
      const list = subsByUser.get(s.userId) ?? [];
      list.push({ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth });
      subsByUser.set(s.userId, list);
    }

    const tn = (t: { nameAr: string } | null) => t?.nameAr ?? "—";
    const line = `${tn(match.homeTeam)} ${match.homeScore}-${match.awayScore} ${tn(match.awayTeam)} ⚽`;
    const recorded: { userId: string; matchId: string; kind: string }[] = [];

    for (const p of preds) {
      if (alreadySet.has(p.userId)) continue;
      const list = subsByUser.get(p.userId);
      if (!list || list.length === 0) continue;
      const payload = scoredPayload({ line, points: p.pointsAwarded ?? 0, matchId });
      let ok = false;
      for (const sub of list) if (await sendPush(sub, payload)) ok = true;
      if (ok) recorded.push({ userId: p.userId, matchId, kind: "scored" });
    }
    if (recorded.length) {
      await prisma.pushReminder.createMany({ data: recorded, skipDuplicates: true });
    }
    return recorded.length;
  } catch (e) {
    console.error("notifyMatchScored failed:", (e as Error).message);
    return 0;
  }
}

export async function notifyAdminsNewUser(name: string): Promise<void> {
  if (!pushConfigured) return;
  try {
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN", isActive: true },
      select: { id: true },
    });
    const ids = admins.map((a) => a.id);
    if (ids.length === 0) return;
    const subs = await prisma.pushSubscription.findMany({ where: { userId: { in: ids } } });
    if (subs.length === 0) return;
    const payload = newUserPayload(name);
    await Promise.all(
      subs.map((s) =>
        sendPush({ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth }, payload),
      ),
    );
  } catch (e) {
    console.error("notifyAdminsNewUser failed:", (e as Error).message);
  }
}

// Per-goal alert. Arabic-first like every other push; the scorer name is shown in
// Arabic when we know it (Arab players). `tag` collapses to the latest goal of the
// match so a device shows one updating goal alert per match, not a stack.
export function goalPayload(opts: {
  teamAr: string;
  player: string; // Latin scorer name (fallback)
  playerAr?: string; // resolved Arabic name when available
  minute: string;
  note: string | null; // "Penalty" | "Own Goal" | null
  line: string; // e.g. "مصر 1-0 بلجيكا"
  matchId: string;
}): PushPayload {
  const noteAr = opts.note === "Penalty" ? " (ركلة جزاء)" : opts.note === "Own Goal" ? " (هدف عكسي)" : "";
  const who = opts.playerAr || playerDisplayName(opts.player, "ar");
  const min = opts.minute ? ` ${opts.minute}` : "";
  return {
    title: `⚽ هدف! ${opts.teamAr}`,
    body: `${who}${min}${noteAr} — ${opts.line}`,
    url: `/matches/${opts.matchId}`,
    tag: `wc26-goal-${opts.matchId}`,
  };
}

/**
 * Push a single goal to every eligible user. Audience = users with goal alerts
 * ON; users whose scope is "PREDICTED" are included only if they predicted this
 * match. Best-effort — never throws. Returns how many subscriptions were notified.
 */
export async function notifyGoal(opts: {
  matchId: string;
  teamAr: string;
  player: string;
  playerAr?: string;
  minute: string;
  note: string | null;
  line: string;
}): Promise<number> {
  if (!pushConfigured) return 0;
  try {
    // Resolve the audience from per-user prefs. If those columns aren't migrated
    // yet, fall back to EVERY subscription (the intended default = everyone on),
    // so goal alerts still fire immediately rather than silently doing nothing.
    let subs: { endpoint: string; p256dh: string; auth: string }[];
    try {
      const [users, predictors] = await Promise.all([
        prisma.user.findMany({
          where: { isActive: true, notifyGoals: true },
          select: { id: true, notifyGoalsScope: true },
        }),
        prisma.prediction.findMany({ where: { matchId: opts.matchId }, select: { userId: true } }),
      ]);
      const predictorSet = new Set(predictors.map((p) => p.userId));
      const ids = users
        .filter((u) => u.notifyGoalsScope !== "PREDICTED" || predictorSet.has(u.id))
        .map((u) => u.id);
      if (ids.length === 0) return 0;
      subs = await prisma.pushSubscription.findMany({
        where: { userId: { in: ids } },
        select: { endpoint: true, p256dh: true, auth: true },
      });
    } catch {
      subs = await prisma.pushSubscription.findMany({ select: { endpoint: true, p256dh: true, auth: true } });
    }
    if (subs.length === 0) return 0;

    const payload = goalPayload(opts);
    const results = await Promise.all(
      subs.map((s) => sendPush({ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth }, payload)),
    );
    return results.filter(Boolean).length;
  } catch (e) {
    console.error("notifyGoal failed:", (e as Error).message);
    return 0;
  }
}

export function openedPayload(n: number): PushPayload {
  return {
    title: "🟢 فُتح باب التوقّع!",
    body:
      n === 1
        ? "مباراة جديدة أصبحت متاحة للتوقّع الآن — سجّل توقعك! ⚽"
        : `${n} مباريات فُتح التوقّع عليها — سجّل توقعاتك الآن! ⚽`,
    url: "/matches",
    tag: "wc26-open",
  };
}

export function closingPayload(n: number): PushPayload {
  return {
    title: "⏰ آخر فرصة للتوقّع!",
    body:
      n === 1
        ? "مباراة تُغلق قريبًا ولم تتوقّعها بعد — سارِع قبل صافرة البداية! 🔥"
        : `${n} مباريات تُغلق قريبًا ولم تتوقّعها — لا تفوّت النقاط! 🔥`,
    url: "/matches",
    tag: "wc26-closing",
  };
}

export function memberJoinedPayload(name: string, groupName: string, groupId: string): PushPayload {
  return {
    title: "🎉 عضو جديد في مجموعتك!",
    body: `${name} انضم إلى «${groupName}» — رحّب به!`,
    url: `/groups/${groupId}/members`,
    tag: `wc26-join-${groupId}`,
  };
}

export function revealedPayload(n: number, groupId: string): PushPayload {
  return {
    title: "👀 ظهرت توقعات مجموعتك!",
    body:
      n === 1
        ? "بدأت مباراة — شاهد ماذا توقّع بقية أعضاء مجموعتك! 🔮"
        : `بدأت ${n} مباريات — شاهد توقعات أعضاء مجموعتك الآن! 🔮`,
    url: `/groups/${groupId}/predictions`,
    tag: "wc26-revealed",
  };
}

export function scoredPayload(opts: { line: string; points: number; matchId: string }): PushPayload {
  return {
    title: "🏁 صافرة النهاية!",
    body:
      opts.points > 0
        ? `${opts.line} — كسبت +${opts.points} نقطة في الترتيب العام! 🎯`
        : `${opts.line} — لم تُوفَّق هذه المرة، حظًا أوفر في القادمة! 💪`,
    url: `/matches/${opts.matchId}`,
    tag: `wc26-scored-${opts.matchId}`,
  };
}
