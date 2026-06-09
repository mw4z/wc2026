import type { PushPayload } from "./push";

// Single source of truth for reminder copy, shared by the cron (real reminders)
// and the admin "send test" tool (sample previews). Arabic, sporty, with emoji.

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
