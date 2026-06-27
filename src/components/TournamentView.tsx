"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useUI, useLocale } from "./I18nProvider";
import { Flag } from "./Flag";
import { MovementIndicator } from "./LeaderboardTable";
import type { TournamentData, StandingGroup, ThirdPlaceRow, BracketRound, BracketMatch } from "@/lib/standings";

const POLL_MS = 25_000;
const DISPLAY_TZ = process.env.NEXT_PUBLIC_DISPLAY_TZ || "Asia/Riyadh";

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// FLIP animation: when the row order changes (live re-sort), each <tr> glides from
// its previous spot to the new one instead of snapping. Returns a ref map to attach
// to each row by a stable key.
function useFlipRows(orderKey: string) {
  const rows = useRef(new Map<string, HTMLTableRowElement>());
  const prev = useRef(new Map<string, number>());
  useIsoLayoutEffect(() => {
    const cur = new Map<string, number>();
    rows.current.forEach((el, key) => {
      const top = el.offsetTop; // relative to the table → unaffected by page scroll
      cur.set(key, top);
      const old = prev.current.get(key);
      if (old != null && old !== top) {
        const dy = old - top;
        el.style.transition = "none";
        el.style.transform = `translateY(${dy}px)`;
        void el.offsetHeight; // force reflow so the start position sticks
        requestAnimationFrame(() => {
          el.style.transition = "transform 400ms cubic-bezier(0.22, 1, 0.36, 1)";
          el.style.transform = "";
        });
      }
    });
    prev.current = cur;
  }, [orderKey]);
  return rows;
}

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

// Pulsing in-play score for a team whose match is live right now. Coloured by the
// running result: green if this team is ahead, red if behind, neutral if level.
function LiveBadge({ score }: { score: { gf: number; ga: number } }) {
  const state = score.gf > score.ga ? "win" : score.gf < score.ga ? "lose" : "draw";
  const tone =
    state === "win"
      ? "bg-lime-500/15 text-lime-400 ring-lime-500/30"
      : state === "lose"
        ? "bg-red-500/15 text-red-400 ring-red-500/30"
        : "bg-slate-500/15 text-slate-300 ring-slate-400/30";
  const dot = state === "win" ? "bg-lime-400" : state === "lose" ? "bg-red-400" : "bg-slate-300";
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ring-1 ring-inset ${tone}`}>
      <span className="relative flex h-1.5 w-1.5">
        <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${dot}`} />
        <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${dot}`} />
      </span>
      <span dir="ltr" className="tnum">{score.gf}-{score.ga}</span>
    </span>
  );
}

function GroupTable({ group }: { group: StandingGroup }) {
  const UI = useUI();
  const rowRefs = useFlipRows(group.teams.map((t) => t.nameEn).join(","));
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
          {group.teams.map((t, i) => {
            // Top 2 of the group always qualify; the 3rd qualifies only while inside
            // the 8 best-thirds cut. Position-based so it updates live with standings.
            const top2 = i < 2;
            const qualifies = top2 || (i === 2 && t.thirdQualified);
            return (
            <tr
              key={t.nameEn}
              ref={(el) => {
                if (el) rowRefs.current.set(t.nameEn, el);
                else rowRefs.current.delete(t.nameEn);
              }}
              className={`border-t border-white/[0.05] ${qualifies ? "bg-lime-500/[0.07]" : t.live ? "bg-white/[0.04]" : ""}`}
            >
              <td className="py-2 ps-3">
                <div className="relative flex items-center gap-1.5">
                  {qualifies && (
                    <span
                      className={`absolute -start-2 h-3.5 w-1 rounded-full ${top2 ? "bg-lime-400" : "bg-lime-400/50"}`}
                      aria-hidden
                    />
                  )}
                  <span className="font-display font-bold tnum text-slate-300">{i + 1}</span>
                  <MovementIndicator movement={t.movement} />
                </div>
              </td>
              <td className="py-2 ps-2 text-start">
                <span className="flex items-center gap-2">
                  <Flag src={t.flagUrl} className="h-4 w-4 shrink-0" />
                  <span className="truncate font-semibold text-slate-100">{t.nameAr}</span>
                  {t.live && <LiveBadge score={t.live} />}
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
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Best third-placed teams — the 8 best also qualify (a cut line marks the top 8).
function ThirdPlaceTable({ rows }: { rows: ThirdPlaceRow[] }) {
  const UI = useUI();
  const rowRefs = useFlipRows(rows.map((r) => r.team.nameEn).join(","));
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
                  ref={(el) => {
                    if (el) rowRefs.current.set(r.team.nameEn, el);
                    else rowRefs.current.delete(r.team.nameEn);
                  }}
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
                      {r.team.live && <LiveBadge score={r.team.live} />}
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
        <div className="mt-2 border-t border-white/[0.06] pt-1.5 text-center text-[11px] font-semibold tnum text-slate-300">
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
