"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useUI } from "@/components/I18nProvider";
import { BallIcon, ClockIcon, CheckIcon } from "@/components/icons";

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

// "Your predictions today" — the primary daily action on the group page.
export function GroupTodayCard({
  hasToday,
  missing,
  nextLockAt,
}: {
  hasToday: boolean;
  missing: number;
  nextLockAt: string | null;
}) {
  const UI = useUI();
  const g = UI.gpage;
  const [ms, setMs] = useState(() => (nextLockAt ? Date.parse(nextLockAt) - Date.now() : 0));
  useEffect(() => {
    if (!nextLockAt) return;
    const id = setInterval(() => setMs(Date.parse(nextLockAt) - Date.now()), 1000);
    return () => clearInterval(id);
  }, [nextLockAt]);

  if (!hasToday) {
    return (
      <section className="card edge-accent p-5">
        <h2 className="mb-1 font-bold text-gold-400">{g.todayTitle}</h2>
        <p className="mb-3 text-sm text-slate-300">{g.noTodayHint}</p>
        <Link href="/matches" className="btn-ghost flex w-full items-center justify-center gap-1.5">
          <BallIcon className="text-base" />
          {g.showUpcoming}
        </Link>
      </section>
    );
  }

  return (
    <section className="card edge-accent p-5">
      <h2 className="mb-2 font-bold text-gold-400">{g.todayTitle}</h2>
      {missing > 0 ? (
        <p className="mb-1 text-sm font-semibold text-amber-200">
          {UI.summaryRemaining.replace("{m}", String(missing))}
        </p>
      ) : (
        <p className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-lime-400">
          <CheckIcon className="text-base" />
          {g.allPredictedToday}
        </p>
      )}
      {nextLockAt && ms > 0 && (
        <p className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-gold-500/30 bg-gold-500/10 px-3 py-1 text-xs font-semibold text-gold-300">
          <ClockIcon className="text-[13px]" />
          {UI.summaryNearestLock.replace("{time}", fmt(ms))}
        </p>
      )}
      <Link href="/matches" className="btn-primary flex w-full items-center justify-center gap-1.5">
        <BallIcon className="text-base" />
        {g.predictToday}
      </Link>
    </section>
  );
}
