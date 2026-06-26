"use client";

import { useEffect, useRef, useState } from "react";
import { useUI, useLocale } from "./I18nProvider";
import { Flag } from "./Flag";
import { MovementIndicator } from "./LeaderboardTable";
import type { TournamentData, StandingGroup, ThirdPlaceRow, BracketRound, BracketMatch } from "@/lib/standings";

const POLL_MS = 25_000;
const DISPLAY_TZ = process.env.NEXT_PUBLIC_DISPLAY_TZ || "Asia/Riyadh";

// Short "day month · time" label for a bracket match, in the user's locale/timezone.
function kickoffLabel(iso: string, locale: string): string {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: DISPLAY_TZ }).format(d);
  const time = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZone: DISPLAY_TZ }).format(d);
  return `${day} · ${time}`;
}

// Live tournament page: group standings + knockout bracket. Polls /api/tournament
// so points, positions, and live in-match scores update without a refresh.
export function TournamentView({ initial }: { initial: TournamentData }) {
  const UI = useUI();
  const [data, setData] = useState(initial);
  const [tab, setTab] = useState<"groups" | "knockout">("groups");
  const active = useRef(true);

  useEffect(() => {
    active.current = true;
    const tick = async () => {
      try {
        const res = await fetch("/api/tournament", { cache: "no-store" });
        if (!res.ok || !active.current) return;
        const next = (await res.json()) as TournamentData;
        if (active.current && (next.groups.length || next.bracket.length)) setData(next);
      } catch {
        /* keep last data on a transient error */
      }
    };
    const iv = setInterval(tick, POLL_MS);
    return () => {
      active.current = false;
      clearInterval(iv);
    };
  }, []);

  return (
    <div>
      <div className="mb-5 grid grid-cols-2 gap-2">
        {(["groups", "knockout"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-lg border px-3 py-2 text-sm font-bold transition ${
              tab === t
                ? "border-accent-500 bg-accent-500/15 text-accent-400"
                : "border-white/10 text-slate-300 active:bg-white/5"
            }`}
          >
            {t === "groups" ? UI.standingsGroups : UI.standingsKnockout}
          </button>
        ))}
      </div>

      {tab === "groups" ? (
        data.groups.length === 0 ? (
          <p className="card p-6 text-center text-sm text-slate-500">{UI.standingsSoon}</p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              {data.groups.map((g) => (
                <GroupTable key={g.name} group={g} />
              ))}
            </div>
            {data.thirdPlace.length > 0 && <ThirdPlaceTable rows={data.thirdPlace} />}
          </>
        )
      ) : data.bracket.length === 0 ? (
        <p className="card p-6 text-center text-sm text-slate-500">{UI.standingsKnockoutSoon}</p>
      ) : (
        <div className="space-y-6">
          {data.bracket.map((r) => (
            <BracketSection key={r.stage} round={r} />
          ))}
        </div>
      )}
    </div>
  );
}

function GroupTable({ group }: { group: StandingGroup }) {
  const UI = useUI();
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-bold text-gold-400">
        {group.name}
      </div>
      <table className="w-full text-right text-xs">
        <thead className="text-[10px] text-slate-400">
          <tr>
            <th className="py-1.5 ps-3 font-bold">#</th>
            <th className="py-1.5 ps-2 text-start font-bold">{UI.colTeam}</th>
            <th className="py-1.5 px-1 font-bold">{UI.colPlayed}</th>
            <th className="hidden py-1.5 px-1 font-bold min-[400px]:table-cell">{UI.colWin}</th>
            <th className="hidden py-1.5 px-1 font-bold min-[400px]:table-cell">{UI.colDraw}</th>
            <th className="hidden py-1.5 px-1 font-bold min-[400px]:table-cell">{UI.colLoss}</th>
            <th className="py-1.5 px-1 font-bold">{UI.colGd}</th>
            <th className="py-1.5 pe-3 font-bold">{UI.colPts}</th>
          </tr>
        </thead>
        <tbody>
          {group.teams.map((t, i) => (
            <tr
              key={t.nameEn}
              className={`border-t border-white/[0.05] ${t.advanced ? "bg-lime-500/[0.07]" : ""}`}
            >
              <td className="py-2 ps-3">
                <div className="relative flex items-center gap-1.5">
                  {t.advanced && <span className="absolute -start-2 h-3.5 w-1 rounded-full bg-lime-400" aria-hidden />}
                  <span className="font-display font-bold tnum text-slate-300">{i + 1}</span>
                  <MovementIndicator movement={t.movement} />
                </div>
              </td>
              <td className="py-2 ps-2 text-start">
                <span className="flex items-center gap-2">
                  <Flag src={t.flagUrl} className="h-4 w-4 shrink-0" />
                  <span className="truncate font-semibold text-slate-100">{t.nameAr}</span>
                </span>
              </td>
              <td className="py-2 px-1 text-center tnum text-slate-300">{t.played}</td>
              <td className="hidden py-2 px-1 text-center tnum text-slate-300 min-[400px]:table-cell">{t.win}</td>
              <td className="hidden py-2 px-1 text-center tnum text-slate-300 min-[400px]:table-cell">{t.draw}</td>
              <td className="hidden py-2 px-1 text-center tnum text-slate-300 min-[400px]:table-cell">{t.loss}</td>
              <td className="py-2 px-1 text-center tnum text-slate-300" dir="ltr">
                {t.gd > 0 ? `+${t.gd}` : t.gd}
              </td>
              <td className="py-2 pe-3 text-center font-display font-extrabold tnum text-gold-400">{t.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Best third-placed teams — the 8 best also qualify (a cut line marks the top 8).
function ThirdPlaceTable({ rows }: { rows: ThirdPlaceRow[] }) {
  const UI = useUI();
  return (
    <div className="mt-6">
      <h2 className="eyebrow mb-2">{UI.thirdPlaceTitle}</h2>
      <p className="mb-3 text-xs text-slate-500">{UI.thirdPlaceHint}</p>
      <div className="card overflow-x-auto">
        <table className="w-full text-right text-xs">
          <thead className="text-[10px] text-slate-400">
            <tr>
              <th className="py-1.5 ps-3 font-bold">#</th>
              <th className="py-1.5 ps-2 text-start font-bold">{UI.colTeam}</th>
              <th className="py-1.5 px-1 font-bold">{UI.colGroup}</th>
              <th className="py-1.5 px-1 font-bold">{UI.colPlayed}</th>
              <th className="hidden py-1.5 px-1 font-bold min-[400px]:table-cell">{UI.colWin}</th>
              <th className="hidden py-1.5 px-1 font-bold min-[400px]:table-cell">{UI.colDraw}</th>
              <th className="hidden py-1.5 px-1 font-bold min-[400px]:table-cell">{UI.colLoss}</th>
              <th className="py-1.5 px-1 font-bold">{UI.colGd}</th>
              <th className="py-1.5 pe-3 font-bold">{UI.colPts}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const qualifies = i < 8;
              return (
                <tr
                  key={r.team.nameEn}
                  className={`border-t border-white/[0.05] ${qualifies ? "bg-lime-500/[0.06]" : ""} ${
                    i === 7 ? "border-b-2 border-b-lime-500/40" : ""
                  }`}
                >
                  <td className="py-2 ps-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-display font-bold tnum text-slate-300">{i + 1}</span>
                      <MovementIndicator movement={r.movement} />
                    </div>
                  </td>
                  <td className="py-2 ps-2 text-start">
                    <span className="flex items-center gap-2">
                      <Flag src={r.team.flagUrl} className="h-4 w-4 shrink-0" />
                      <span className="truncate font-semibold text-slate-100">{r.team.nameAr}</span>
                    </span>
                  </td>
                  <td className="py-2 px-1 text-center text-slate-400">{r.group.replace(/^Group\s*/i, "")}</td>
                  <td className="py-2 px-1 text-center tnum text-slate-300">{r.team.played}</td>
                  <td className="hidden py-2 px-1 text-center tnum text-slate-300 min-[400px]:table-cell">{r.team.win}</td>
                  <td className="hidden py-2 px-1 text-center tnum text-slate-300 min-[400px]:table-cell">{r.team.draw}</td>
                  <td className="hidden py-2 px-1 text-center tnum text-slate-300 min-[400px]:table-cell">{r.team.loss}</td>
                  <td className="py-2 px-1 text-center tnum text-slate-300" dir="ltr">
                    {r.team.gd > 0 ? `+${r.team.gd}` : r.team.gd}
                  </td>
                  <td className="py-2 pe-3 text-center font-display font-extrabold tnum text-gold-400">{r.team.points}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BracketSection({ round }: { round: BracketRound }) {
  const UI = useUI();
  return (
    <section>
      <h2 className="eyebrow mb-2">{UI.stages[round.stage]}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {round.matches.map((m) => (
          <BracketCard key={m.matchNumber} m={m} />
        ))}
      </div>
    </section>
  );
}

function BracketCard({ m }: { m: BracketMatch }) {
  const UI = useUI();
  const locale = useLocale();
  const hasScore = m.homeScore != null && m.awayScore != null;
  return (
    <div className={`card px-3 py-2.5 ${m.live ? "card-live" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <BracketSide team={m.home} tbd={UI.tbd} />
        <div className="flex shrink-0 flex-col items-center px-1">
          {hasScore ? (
            <span className="font-display text-lg font-extrabold tnum" dir="ltr">
              {m.homeScore} : {m.awayScore}
            </span>
          ) : (
            <span className="text-xs text-slate-500">{UI.vs}</span>
          )}
          {m.live && <span className="text-[9px] font-bold uppercase text-lime-400">{UI.statuses.LIVE}</span>}
        </div>
        <BracketSide team={m.away} tbd={UI.tbd} align="end" />
      </div>
      {!m.live && (
        <div className="mt-1.5 border-t border-white/[0.06] pt-1 text-center text-[10px] tnum text-slate-500" dir="ltr">
          {kickoffLabel(m.kickoffISO, locale)}
        </div>
      )}
    </div>
  );
}

function BracketSide({ team, tbd, align = "start" }: { team: BracketMatch["home"]; tbd: string; align?: "start" | "end" }) {
  return (
    <div className={`flex min-w-0 flex-1 items-center gap-1.5 ${align === "end" ? "flex-row-reverse text-end" : "text-start"}`}>
      <Flag src={team?.flagUrl} className="h-5 w-5 shrink-0" />
      <span className="truncate text-xs font-semibold text-slate-100">{team?.nameAr ?? tbd}</span>
    </div>
  );
}
