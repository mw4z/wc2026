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
    const recorded: { userId: string; matchId: string; kind: string }[] = [];

    for (const p of preds) {
      if (alreadySet.has(p.userId)) continue;
      const list = subsByUser.get(p.userId);
      if (!list || list.length === 0) continue;
      const payload = scoredPayload({
        home: tn(match.homeTeam),
        away: tn(match.awayTeam),
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        points: p.pointsAwarded ?? 0,
        matchId,
      });
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
    // Unique per goal so two goals in the same match don't collapse into one.
    tag: `wc26-goal-${opts.matchId}-${opts.minute}-${opts.player}`,
  };
}

// A VAR-cancelled goal: tell users it was disallowed and show the corrected score.
export function goalCancelledPayload(opts: {
  teamAr: string;
  player: string;
  playerAr?: string;
  minute: string;
  line: string; // corrected score, e.g. "مصر 1-0 بلجيكا"
  matchId: string;
}): PushPayload {
  const who = opts.playerAr || playerDisplayName(opts.player, "ar");
  const min = opts.minute ? ` ${opts.minute}` : "";
  return {
    title: `🚫 هدف ملغى — ${opts.teamAr}`,
    body: `أُلغي هدف ${who}${min} (حكم الفيديو). النتيجة الآن: ${opts.line}`,
    url: `/matches/${opts.matchId}`,
    tag: `wc26-goalcancel-${opts.matchId}-${opts.minute}-${opts.player}`,
  };
}

// A penalty-shootout kick (separate phase): notify per scored kick with the running
// shootout tally, no match minute. Tag is unique per kick (index) so they don't
// collapse and each shows once.
export function shootoutGoalPayload(opts: {
  teamAr: string;
  player: string;
  playerAr?: string;
  line: string; // running shootout tally, e.g. "المغرب 3-2 هولندا"
  matchId: string;
  index: number;
}): PushPayload {
  const who = opts.playerAr || playerDisplayName(opts.player, "ar");
  return {
    title: `⚽ ركلات الترجيح — ${opts.teamAr}`,
    body: `${who} سجّل — ${opts.line}`,
    url: `/matches/${opts.matchId}`,
    tag: `wc26-pk-${opts.matchId}-${opts.index}`,
  };
}

/** Push a single penalty-shootout kick to the goal audience. Best-effort. */
export async function notifyShootoutGoal(opts: {
  matchId: string;
  teamAr: string;
  player: string;
  playerAr?: string;
  line: string;
  index: number;
}): Promise<number> {
  if (!pushConfigured) return 0;
  try {
    const subs = await goalAudienceSubs(opts.matchId);
    if (subs.length === 0) return 0;
    const payload = shootoutGoalPayload(opts);
    const results = await Promise.all(subs.map((s) => sendPush(s, payload)));
    return results.filter(Boolean).length;
  } catch (e) {
    console.error("notifyShootoutGoal failed:", (e as Error).message);
    return 0;
  }
}

// Audience for goal alerts: users with goal alerts ON; PREDICTED scope is limited
// to the match's predictors. Falls back to EVERY subscription if the prefs columns
// aren't migrated. Best-effort.
async function goalAudienceSubs(matchId: string): Promise<{ endpoint: string; p256dh: string; auth: string }[]> {
  try {
    const [users, predictors] = await Promise.all([
      prisma.user.findMany({
        where: { isActive: true, notifyGoals: true },
        select: { id: true, notifyGoalsScope: true },
      }),
      prisma.prediction.findMany({ where: { matchId }, select: { userId: true } }),
    ]);
    const predictorSet = new Set(predictors.map((p) => p.userId));
    const ids = users
      .filter((u) => u.notifyGoalsScope !== "PREDICTED" || predictorSet.has(u.id))
      .map((u) => u.id);
    if (ids.length === 0) return [];
    return prisma.pushSubscription.findMany({
      where: { userId: { in: ids } },
      select: { endpoint: true, p256dh: true, auth: true },
    });
  } catch {
    return prisma.pushSubscription.findMany({ select: { endpoint: true, p256dh: true, auth: true } });
  }
}

/**
 * Push a single goal to every eligible user. Best-effort — never throws. Returns
 * how many subscriptions were notified.
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
    const subs = await goalAudienceSubs(opts.matchId);
    if (subs.length === 0) return 0;
    const payload = goalPayload(opts);
    const results = await Promise.all(subs.map((s) => sendPush(s, payload)));
    return results.filter(Boolean).length;
  } catch (e) {
    console.error("notifyGoal failed:", (e as Error).message);
    return 0;
  }
}

/** Push a goal-cancellation (VAR) alert to the same audience. Best-effort. */
export async function notifyGoalCancelled(opts: {
  matchId: string;
  teamAr: string;
  player: string;
  playerAr?: string;
  minute: string;
  line: string;
}): Promise<number> {
  if (!pushConfigured) return 0;
  try {
    const subs = await goalAudienceSubs(opts.matchId);
    if (subs.length === 0) return 0;
    const payload = goalCancelledPayload(opts);
    const results = await Promise.all(subs.map((s) => sendPush(s, payload)));
    return results.filter(Boolean).length;
  } catch (e) {
    console.error("notifyGoalCancelled failed:", (e as Error).message);
    return 0;
  }
}

/**
 * Notify group members that a match just KICKED OFF (their picks are now revealed),
 * the moment ESPN reports it in-play. Audience = users in an active group (≥2
 * members). Deduped per (user, match) via PushReminder kind="revealed", so the
 * every-minute caller fires it exactly once and the hourly cron never repeats it.
 * Best-effort — never throws.
 */
export async function notifyMatchStarted(matchId: string): Promise<number> {
  if (!pushConfigured) return 0;
  try {
    // Name the teams so the alert is specific to this match.
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { homeTeam: { select: { nameAr: true } }, awayTeam: { select: { nameAr: true } } },
    });
    const label =
      match?.homeTeam && match?.awayTeam ? `${match.homeTeam.nameAr} ضد ${match.awayTeam.nameAr}` : null;

    const memberships = await prisma.groupMember.findMany({
      where: { group: { isActive: true } },
      select: { userId: true, groupId: true },
    });
    if (memberships.length === 0) return 0;
    const size = new Map<string, number>();
    for (const m of memberships) size.set(m.groupId, (size.get(m.groupId) ?? 0) + 1);
    const userGroup = new Map<string, string>(); // userId → first group with ≥2 members
    for (const m of memberships) {
      if (!userGroup.has(m.userId) && (size.get(m.groupId) ?? 0) >= 2) userGroup.set(m.userId, m.groupId);
    }
    const userIds = [...userGroup.keys()];
    if (userIds.length === 0) return 0;

    const [already, subs] = await Promise.all([
      prisma.pushReminder.findMany({
        where: { matchId, kind: "revealed", userId: { in: userIds } },
        select: { userId: true },
      }),
      prisma.pushSubscription.findMany({ where: { userId: { in: userIds } } }),
    ]);
    const alreadySet = new Set(already.map((r) => r.userId));
    const subsByUser = new Map<string, StoredSubscription[]>();
    for (const s of subs) {
      const list = subsByUser.get(s.userId) ?? [];
      list.push({ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth });
      subsByUser.set(s.userId, list);
    }

    const recorded: { userId: string; matchId: string; kind: string }[] = [];
    for (const userId of userIds) {
      if (alreadySet.has(userId)) continue;
      const list = subsByUser.get(userId);
      if (!list || list.length === 0) continue;
      const payload = revealedPayload(1, userGroup.get(userId)!, label ? { id: matchId, label } : undefined);
      let ok = false;
      for (const sub of list) if (await sendPush(sub, payload)) ok = true;
      if (ok) recorded.push({ userId, matchId, kind: "revealed" });
    }
    if (recorded.length) await prisma.pushReminder.createMany({ data: recorded, skipDuplicates: true });
    return recorded.length;
  } catch (e) {
    console.error("notifyMatchStarted failed:", (e as Error).message);
    return 0;
  }
}

export function installReminderPayload(): PushPayload {
  return {
    title: "📲 ثبّت GamePredict على شاشتك الرئيسية",
    body: "أضِف التطبيق إلى شاشتك الرئيسية لفتحٍ أسرع وتنبيهات فورية — اضغط لمعرفة الخطوات بالصور.",
    url: "/matches?install=1",
    tag: "wc26-install",
  };
}

/**
 * Nudge users who enabled notifications but HAVEN'T installed the app yet to add it
 * to their home screen (they often ignore the in-app banner). Throttled to once
 * every few days per user via installRemindedAt; stops automatically once the user
 * opens the app in standalone mode (appInstalledAt set). Best-effort.
 */
export async function notifyInstallReminders(): Promise<number> {
  if (!pushConfigured) return 0;
  try {
    const INTERVAL_MS = 3 * 24 * 3600_000; // at most once every 3 days
    const cutoff = new Date(Date.now() - INTERVAL_MS);
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        appInstalledAt: null,
        pushSubscriptions: { some: {} },
        OR: [{ installRemindedAt: null }, { installRemindedAt: { lt: cutoff } }],
      },
      select: { id: true },
    });
    if (users.length === 0) return 0;
    const ids = users.map((u) => u.id);
    const subs = await prisma.pushSubscription.findMany({ where: { userId: { in: ids } } });
    const subsByUser = new Map<string, StoredSubscription[]>();
    for (const s of subs) {
      const list = subsByUser.get(s.userId) ?? [];
      list.push({ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth });
      subsByUser.set(s.userId, list);
    }

    const payload = installReminderPayload();
    const remindedIds: string[] = [];
    for (const id of ids) {
      const list = subsByUser.get(id);
      if (!list || list.length === 0) continue;
      let ok = false;
      for (const sub of list) if (await sendPush(sub, payload)) ok = true;
      if (ok) remindedIds.push(id);
    }
    if (remindedIds.length) {
      await prisma.user.updateMany({ where: { id: { in: remindedIds } }, data: { installRemindedAt: new Date() } });
    }
    return remindedIds.length;
  } catch (e) {
    console.error("notifyInstallReminders failed:", (e as Error).message);
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

// `match` (a single kicked-off match) makes the alert specific — naming the teams
// and giving it its own tag so each match's start shows separately. Without it
// (hourly digest of several), it stays a generic group message.
export function revealedPayload(
  n: number,
  groupId: string,
  match?: { id: string; label: string },
): PushPayload {
  return {
    title: "👀 ظهرت توقعات مجموعتك!",
    body: match
      ? `بدأت مباراة ${match.label} — شاهد ماذا توقّع بقية أعضاء مجموعتك! 🔮`
      : n === 1
        ? "بدأت مباراة — شاهد ماذا توقّع بقية أعضاء مجموعتك! 🔮"
        : `بدأت ${n} مباريات — شاهد توقعات أعضاء مجموعتك الآن! 🔮`,
    url: `/groups/${groupId}/predictions`,
    tag: match ? `wc26-revealed-${match.id}` : "wc26-revealed",
  };
}

export function scoredPayload(opts: {
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
  points: number;
  matchId: string;
}): PushPayload {
  // Final result, clearly between the two teams (title only — not repeated below).
  const result = `${opts.home} ${opts.homeScore} - ${opts.awayScore} ${opts.away}`;
  return {
    title: `🏁 صافرة النهاية: ${result}`,
    body:
      opts.points > 0
        ? `كسبت +${opts.points} نقطة في الترتيب العام! 🎯`
        : `لم تُوفَّق هذه المرة، حظًا أوفر في القادمة! 💪`,
    url: `/matches/${opts.matchId}`,
    tag: `wc26-scored-${opts.matchId}`,
  };
}
