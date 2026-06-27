"use client";

import { useState } from "react";
import { useUI, useLocale } from "./I18nProvider";
import { Flag } from "./Flag";
import { Spinner } from "./Spinner";
import { StandingsIcon } from "./icons";
import type { MatchForm, TeamForm, FormGame } from "@/lib/matchCenter";

// "Recent results" sheet for a match card — each team's last few games (from ESPN),
// to help users predict. Fetches on first open; the data layer caches it.
export function MatchFormSheet({
  matchId,
  homeName,
  awayName,
  homeFlag,
  awayFlag,
}: {
  matchId: string;
  homeName: string;
  awayName: string;
  homeFlag: string | null;
  awayFlag: string | null;
}) {
  const UI = useUI();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<MatchForm | null>(null);
  const [loading, setLoading] = useState(false);

  async function openSheet() {
    setOpen(true);
    if (data || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/matches/${matchId}/form`, { cache: "no-store" });
      if (res.ok) setData((await res.json()) as MatchForm);
    } catch {
      /* show the empty state on error */
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          openSheet();
        }}
        className="btn-ghost mt-2 inline-flex w-full items-center justify-center gap-1.5 text-sm"
      >
        <StandingsIcon className="text-base" />
        {UI.formButton}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(false);
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="reveal relative z-10 max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border-t border-white/10 bg-navy-950 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-12px_40px_rgba(0,0,0,0.6)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-bold text-gold-400">
                <StandingsIcon /> {UI.formTitle}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full px-2 py-1 text-sm text-slate-400 hover:text-white"
                aria-label="close"
              >
                ✕
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-10">
                <Spinner />
              </div>
            ) : !data?.available ? (
              <p className="py-10 text-center text-sm text-slate-500">{UI.formNone}</p>
            ) : (
              <div className="space-y-5">
                <TeamFormBlock form={data.home} teamName={homeName} flag={homeFlag} />
                <TeamFormBlock form={data.away} teamName={awayName} flag={awayFlag} />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function TeamFormBlock({ form, teamName, flag }: { form: TeamForm | null; teamName: string; flag: string | null }) {
  const UI = useUI();
  if (!form || form.games.length === 0) return null;

  // W/D/L tally + percentages over the games that have a result.
  const w = form.games.filter((g) => g.result === "W").length;
  const d = form.games.filter((g) => g.result === "D").length;
  const l = form.games.filter((g) => g.result === "L").length;
  const total = w + d + l;
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <Flag src={flag} className="h-5 w-5" />
        <span className="font-bold text-slate-100">{teamName}</span>
        <span className="ms-auto flex items-center gap-1">
          {form.games.map((g, i) => (
            <ResultDot key={i} r={g.result} />
          ))}
        </span>
      </div>

      {total > 0 && (
        <div className="mb-2">
          {/* Proportional W/D/L bar */}
          <div className="flex h-2 overflow-hidden rounded-full bg-white/5" dir="ltr">
            {w > 0 && <span className="bg-lime-500" style={{ width: `${pct(w)}%` }} />}
            {d > 0 && <span className="bg-slate-500" style={{ width: `${pct(d)}%` }} />}
            {l > 0 && <span className="bg-red-500" style={{ width: `${pct(l)}%` }} />}
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px] font-semibold">
            <span className="text-lime-400">{UI.formWon} {pct(w)}% <span className="text-slate-500">({w})</span></span>
            <span className="text-slate-300">{UI.formDrawn} {pct(d)}% <span className="text-slate-500">({d})</span></span>
            <span className="text-red-400">{UI.formLost} {pct(l)}% <span className="text-slate-500">({l})</span></span>
          </div>
          <div className="mt-0.5 text-center text-[10px] text-slate-600">
            {UI.formFromGames.replace("{n}", String(total))}
          </div>
        </div>
      )}

      <div className="card divide-y divide-white/[0.06] overflow-hidden">
        {form.games.map((g, i) => (
          <FormRow key={i} g={g} />
        ))}
      </div>
    </div>
  );
}

function ResultDot({ r }: { r: FormGame["result"] }) {
  const cls = r === "W" ? "bg-lime-500" : r === "L" ? "bg-red-500" : r === "D" ? "bg-slate-500" : "bg-white/20";
  return <span className={`h-2.5 w-2.5 rounded-full ${cls}`} aria-hidden />;
}

function FormRow({ g }: { g: FormGame }) {
  const UI = useUI();
  const locale = useLocale();
  const date = g.dateISO
    ? new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(new Date(g.dateISO))
    : "";
  const tone =
    g.result === "W"
      ? "bg-lime-500 text-navy-950"
      : g.result === "L"
        ? "bg-red-500 text-white"
        : "bg-slate-500 text-white";
  return (
    <div className="flex items-center gap-2.5 px-3 py-2 text-sm">
      <span className={`grid h-5 w-5 shrink-0 place-items-center rounded text-[11px] font-extrabold ${tone}`}>
        {UI.formResult[g.result || "D"]}
      </span>
      <Flag src={g.opponentLogo} className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate text-slate-200">{g.opponent}</span>
      <span className="shrink-0 rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-bold text-slate-400">
        {g.home ? UI.formAtHome : UI.formAway}
      </span>
      <span className="shrink-0 font-display font-bold tnum text-slate-100" dir="ltr">
        {g.gf ?? "-"}-{g.ga ?? "-"}
      </span>
      {date && <span className="hidden shrink-0 text-[11px] text-slate-500 min-[400px]:inline">{date}</span>}
    </div>
  );
}
