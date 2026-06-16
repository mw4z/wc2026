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

// Today summary on /matches. ONE consistent scope: today's matches only — so the
// numbers never mix "today" with "all open across days". `todayOpen` = today's
// matches you can still predict; `todayMissing` = those not predicted yet. The
// nearest-lock countdown is for today's open matches.
export function TodaySummary({
  todayTotal,
  todayOpen,
  todayMissing,
  nextLockAt,
}: {
  todayTotal: number;
  todayOpen: number;
  todayMissing: number;
  nextLockAt: string | null;
}) {
  const UI = useUI();
  const [ms, setMs] = useState(() => (nextLockAt ? Date.parse(nextLockAt) - Date.now() : 0));
  useEffect(() => {
    if (!nextLockAt) return;
    const id = setInterval(() => setMs(Date.parse(nextLockAt) - Date.now()), 1000);
    return () => clearInterval(id);
  }, [nextLockAt]);

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

      {/* Primary line — strictly today-scoped (denominator = today's total). */}
      <div className="mt-2 text-base font-bold">
        {todayOpen === 0 ? (
          <span className="text-slate-300">{UI.summaryNoOpenToday}</span>
        ) : todayMissing === 0 ? (
          <span className="text-lime-400">{UI.summaryTodayDone}</span>
        ) : (
          <span className="text-amber-200">
            {UI.summaryTodayRemaining.replace("{m}", String(todayMissing)).replace("{t}", String(todayTotal))}
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
