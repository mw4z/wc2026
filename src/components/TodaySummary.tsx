"use client";

import { useEffect, useState } from "react";
import { useUI } from "@/components/I18nProvider";
import { ClockIcon } from "@/components/icons";

function fmt(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return d > 0 ? `${d}ي ${p(h)}:${p(m)}:${p(sec)}` : `${p(h)}:${p(m)}:${p(sec)}`;
}

// Nudge on /matches: how many OPEN predictions you still need to fill (across all
// available matches, not just today), plus a countdown to the nearest lock.
export function TodaySummary({
  todayTotal,
  openTotal,
  openMissing,
  nextLockAt,
}: {
  todayTotal: number;
  openTotal: number;
  openMissing: number;
  nextLockAt: string | null;
}) {
  const UI = useUI();
  const [ms, setMs] = useState(() => (nextLockAt ? Date.parse(nextLockAt) - Date.now() : 0));
  useEffect(() => {
    if (!nextLockAt) return;
    const id = setInterval(() => setMs(Date.parse(nextLockAt) - Date.now()), 1000);
    return () => clearInterval(id);
  }, [nextLockAt]);

  const done = openMissing === 0;

  return (
    <div className="card edge-accent mb-6 p-4">
      {/* Header: title + nearest-lock countdown on the opposite side. */}
      <div className="flex items-center justify-between gap-3">
        <div className="font-bold text-gold-400">{UI.todaySummaryTitle}</div>
        {nextLockAt && ms > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-500/30 bg-gold-500/10 px-3 py-1 text-xs font-semibold text-gold-300">
            <ClockIcon className="text-[13px]" />
            {UI.summaryNearestLock.replace("{time}", fmt(ms))}
          </span>
        )}
      </div>

      {/* Primary, actionable line: open predictions still to fill. */}
      <div className="mt-2 text-base font-bold">
        {openTotal === 0 ? (
          <span className="text-slate-300">{UI.summaryNoOpen}</span>
        ) : done ? (
          <span className="text-lime-400">{UI.summaryAllDone}</span>
        ) : (
          <span className="text-amber-200">
            {UI.summaryOpenRemaining.replace("{m}", String(openMissing)).replace("{t}", String(openTotal))}
          </span>
        )}
      </div>

      {todayTotal > 0 && (
        <div className="mt-1 text-xs text-slate-400">
          {UI.summaryTodayCount.replace("{n}", String(todayTotal))}
        </div>
      )}
    </div>
  );
}
