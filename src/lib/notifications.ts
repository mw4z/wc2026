import { prisma } from "./prisma";
import { pushConfigured, sendPush, type PushPayload } from "./push";

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
        ? `${opts.line} — كسبت +${opts.points} نقطة! 🎯`
        : `${opts.line} — لم تُوفَّق هذه المرة، حظًا أوفر في القادمة! 💪`,
    url: `/matches/${opts.matchId}`,
    tag: `wc26-scored-${opts.matchId}`,
  };
}
