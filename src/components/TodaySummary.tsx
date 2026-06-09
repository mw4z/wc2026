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

// Daily nudge on /matches: how many of today's matches you've predicted, how many
// are still open, and a countdown to the nearest lock. Pure UI over passed data.
export function TodaySummary({
  total,
  submitted,
  missing,
  nextLockAt,
}: {
  total: number;
  submitted: number;
  missing: number;
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="font-bold text-gold-400">{UI.todayMatches}</div>
          <div className="text-sm text-slate-300">
            {UI.summaryPredicted.replace("{s}", String(submitted)).replace("{t}", String(total))}
          </div>
        </div>
        {missing > 0 && (
          <div className="text-sm font-semibold text-amber-200">
            {UI.summaryRemaining.replace("{m}", String(missing))}
          </div>
        )}
      </div>
      {nextLockAt && ms > 0 && (
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-gold-500/30 bg-gold-500/10 px-3 py-1 text-xs text-gold-300">
          <ClockIcon className="text-[13px]" />
          {UI.summaryNearestLock.replace("{time}", fmt(ms))}
        </div>
      )}
    </div>
  );
}
