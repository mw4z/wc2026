"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Spinner } from "@/components/Spinner";

export interface MatchFilterTab {
  key: string;
  label: string;
  count: number;
}

// Match-list filter as an equal-width segmented control. Uses a transition so the
// pressed tab highlights INSTANTLY (optimistic) and shows a small spinner while the
// server renders the filtered list — no press-delay feel.
export function MatchFilters({ filters, active }: { filters: MatchFilterTab[]; active: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pending, setPending] = useState<string | null>(null);

  function go(key: string) {
    if (key === active) return;
    setPending(key);
    startTransition(() => {
      router.push(key === "all" ? "/matches" : `/matches?show=${key}`, { scroll: false });
    });
  }

  return (
    <div className="mb-5 grid grid-cols-4 gap-1.5">
      {filters.map((f) => {
        const loading = isPending && pending === f.key;
        // Optimistic: the pressed tab looks selected immediately, before the server
        // responds (and the real `active` catches up after navigation).
        const selected = pending ? pending === f.key : active === f.key;
        return (
          <button
            key={f.key}
            type="button"
            onClick={() => go(f.key)}
            disabled={isPending}
            className={`flex flex-col items-center justify-center gap-0.5 rounded-lg border px-1 py-1.5 text-center transition ${
              selected
                ? "border-accent-500 bg-accent-500/15 text-accent-400"
                : "border-white/10 text-slate-300 active:bg-white/5"
            }`}
          >
            <span className="flex items-center justify-center gap-1 truncate text-[13px] font-semibold leading-none">
              {loading && <Spinner className="h-3 w-3 border" />}
              {f.label}
            </span>
            <span className={`tnum text-[10px] leading-none ${selected ? "text-accent-300/80" : "text-slate-500"}`}>
              {f.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
