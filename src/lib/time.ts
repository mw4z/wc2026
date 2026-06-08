// All persisted times are UTC. These helpers format for display in the user's
// (or a configured) timezone. We avoid extra deps by using Intl.

const DISPLAY_TZ = process.env.NEXT_PUBLIC_DISPLAY_TZ || "Asia/Riyadh";

export function formatDateTimeAr(date: Date | string, tz: string = DISPLAY_TZ): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("ar", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: tz,
  }).format(d);
}

export function formatTimeAr(date: Date | string, tz: string = DISPLAY_TZ): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("ar", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: tz,
  }).format(d);
}

export function isSameDayInTz(a: Date, b: Date, tz: string = DISPLAY_TZ): boolean {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: tz,
  });
  return fmt.format(a) === fmt.format(b);
}

/** True once kickoff has been reached (server clock is the source of truth). */
export function isKickoffReached(kickoffAt: Date | string, now: Date = new Date()): boolean {
  const k = typeof kickoffAt === "string" ? new Date(kickoffAt) : kickoffAt;
  return now.getTime() >= k.getTime();
}
