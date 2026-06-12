"use client";

import { useState } from "react";
import Link from "next/link";
import { useUI } from "@/components/I18nProvider";
import { Flag } from "@/components/Flag";
import { GroupReminderCard, type ReminderMatch } from "./GroupReminderCard";

interface Pick { name: string; home: number | null; away: number | null; points: number | null }
export interface MatchView {
  id: string;
  matchNumber: number;
  stage: string;
  kickoffAt: string;
  home: string;
  away: string;
  homeFlag: string | null;
  awayFlag: string | null;
  homeScore: number | null;
  awayScore: number | null;
  locked: boolean;
  predictedCount: number;
  total: number;
  picks: Pick[] | null;
  pending: string[] | null;
}

interface RosterEntry { name: string; predicted: number; total: number; missing: number; missingMatches: string[] }

export function GroupPredictions({
  groupId,
  groupName,
  groupCode,
  isLeader,
  winnerOnly,
  upcoming,
  revealed,
  roster,
  reminderMatches,
}: {
  groupId: string;
  groupName: string;
  groupCode: string;
  isLeader: boolean;
  winnerOnly: boolean;
  upcoming: MatchView[];
  revealed: MatchView[];
  roster: RosterEntry[];
  reminderMatches: ReminderMatch[];
}) {
  const UI = useUI();
  const [notifyMsg, setNotifyMsg] = useState<string | null>(null);
  const [notifying, setNotifying] = useState(false);

  async function notifyPending() {
    setNotifying(true);
    setNotifyMsg(null);
    try {
      const res = await fetch(`/api/groups/${groupId}/nudge`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setNotifyMsg(data.error || UI.notifyFailed);
        return;
      }
      setNotifyMsg(UI.notifySent.replace("{n}", String(data.notified ?? 0)));
    } catch {
      setNotifyMsg(UI.notifyFailed);
    } finally {
      setNotifying(false);
    }
  }

  const behind = roster.filter((r) => r.missing > 0);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-extrabold">{UI.groupPredictions}</h1>
          <p className="text-sm text-slate-400">{groupName}</p>
        </div>
        <Link href={`/groups/${groupId}`} className="btn-ghost px-3 py-1.5 text-sm">{UI.backToGroup}</Link>
      </div>

      {/* Leader: match-specific reminder (pick a match → WhatsApp / copy). */}
      {isLeader && (
        <div className="mb-6">
          <GroupReminderCard matches={reminderMatches} code={groupCode} />
        </div>
      )}

      {/* Roster: who is behind on upcoming predictions (clear who hasn't voted). */}
      {roster.length > 0 && upcoming.length > 0 && (
        <div className="card mb-6 p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="eyebrow">{UI.predictionStatus}</span>
            {isLeader && (
              <button onClick={notifyPending} disabled={notifying || behind.length === 0} className="btn-primary px-3 py-1.5 text-sm">
                {notifying ? UI.notifying : UI.notifyPending}
              </button>
            )}
          </div>
          {notifyMsg && <p className="mb-2 text-sm text-accent-300">{notifyMsg}</p>}
          <div className="space-y-1">
            {roster.map((r, i) => <RosterRow key={i} r={r} />)}
          </div>
          {isLeader && (
            <p className="mt-2 text-xs text-slate-500">{UI.notifyHint}</p>
          )}
        </div>
      )}

      {/* Upcoming — status only (who predicted / who didn't). Picks stay hidden. */}
      <section className="mb-8">
        <div className="mb-2 flex items-center gap-2">
          <span className="eyebrow">{UI.upcomingMatches}</span>
          <span className="text-xs text-slate-500">{UI.hiddenUntilKickoff}</span>
        </div>
        {upcoming.length === 0 ? (
          <p className="card p-4 text-center text-sm text-slate-500">{UI.noUpcoming}</p>
        ) : (
          <div className="space-y-2">
            {upcoming.map((m) => <UpcomingRow key={m.id} m={m} />)}
          </div>
        )}
      </section>

      {/* Revealed — locked/finished matches show everyone's picks. */}
      <section>
        <div className="mb-2">
          <span className="eyebrow">{UI.revealedPredictions}</span>
        </div>
        {revealed.length === 0 ? (
          <p className="card p-4 text-center text-sm text-slate-500">{UI.noRevealedYet}</p>
        ) : (
          <div className="space-y-2">
            {revealed.map((m) => <RevealedRow key={m.id} m={m} winnerOnly={winnerOnly} />)}
          </div>
        )}
      </section>
    </div>
  );
}

function RosterRow({ r }: { r: RosterEntry }) {
  const UI = useUI();
  const [open, setOpen] = useState(false);
  const done = r.missing === 0;
  return (
    <div className="rounded-lg border border-white/[0.05]">
      <button
        onClick={() => !done && setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-start text-sm"
      >
        <span className="truncate text-slate-200">{r.name}</span>
        <span className="flex shrink-0 items-center gap-1.5">
          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${done ? "bg-lime-500/20 text-lime-300" : "bg-warn/20 text-amber-300"}`}>
            {done ? UI.allDone : UI.missingCount.replace("{n}", String(r.missing))}
          </span>
          {!done && <span className="text-xs text-slate-500">{open ? "▲" : "▼"}</span>}
        </span>
      </button>
      {open && !done && (
        <ul className="space-y-1 border-t border-white/[0.05] px-3 py-2 text-xs text-amber-200/90">
          {r.missingMatches.map((mm, i) => (
            <li key={i} className="flex items-center gap-1.5">
              <span className="text-slate-600">•</span> {mm}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MatchHeader({ m }: { m: MatchView }) {
  return (
    <div className="flex items-center gap-2 text-sm font-semibold">
      <Flag src={m.homeFlag} className="h-5 w-5" />
      <span className="truncate">{m.home}</span>
      {m.homeScore != null && m.awayScore != null ? (
        <span className="inline-flex items-center gap-1 font-display tnum text-gold-300">
          <span>{m.homeScore}</span>
          <span>-</span>
          <span>{m.awayScore}</span>
        </span>
      ) : (
        <span className="text-slate-600">×</span>
      )}
      <span className="truncate">{m.away}</span>
      <Flag src={m.awayFlag} className="h-5 w-5" />
    </div>
  );
}

function UpcomingRow({ m }: { m: MatchView }) {
  const UI = useUI();
  const [open, setOpen] = useState(false);
  const allIn = m.predictedCount >= m.total && m.total > 0;
  return (
    <div className="card p-3">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-3 text-start">
        <MatchHeader m={m} />
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${allIn ? "bg-lime-500/20 text-lime-300" : "bg-warn/20 text-amber-300"}`}>
          {UI.predictedCount.replace("{n}", String(m.predictedCount)).replace("{t}", String(m.total))}
        </span>
      </button>
      {open && m.pending && (
        <div className="mt-2 border-t border-white/[0.06] pt-2 text-xs">
          {m.pending.length === 0 ? (
            <span className="text-lime-400">{UI.everyonePredicted}</span>
          ) : (
            <>
              <div className="mb-1 text-slate-500">{UI.notPredictedYet}:</div>
              <div className="flex flex-wrap gap-1.5">
                {m.pending.map((n, i) => (
                  <span key={i} className="rounded-md bg-warn/15 px-2 py-0.5 text-amber-300">{n}</span>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function RevealedRow({ m, winnerOnly }: { m: MatchView; winnerOnly: boolean }) {
  const UI = useUI();
  const [open, setOpen] = useState(false);
  // Winner-only groups store placeholder scores (1-0 / 0-0 / 0-1) — show the
  // picked side/result, not the goals.
  const outcome = (home: number | null, away: number | null) => {
    if (home == null || away == null) return null;
    if (home > away) return m.home;
    if (home < away) return m.away;
    return UI.outcomeDraw;
  };
  return (
    <div className="card p-3">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-3 text-start">
        <MatchHeader m={m} />
        <span className="shrink-0 text-xs text-slate-500">{open ? "▲" : "▼"}</span>
      </button>
      {open && m.picks && (
        <div className="mt-2 border-t border-white/[0.06] pt-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-[11px] text-slate-400">
                <th className="py-1 text-start font-semibold">{UI.name}</th>
                <th className="py-1 text-center font-semibold">
                  {winnerOnly ? (
                    UI.predictedWinner
                  ) : (
                    // Make the score orientation explicit: which side is which team.
                    <span className="inline-flex items-center justify-center gap-1">
                      <Flag src={m.homeFlag} className="h-4 w-4" />
                      <span className="max-w-[4.5rem] truncate">{m.home}</span>
                      <span className="text-slate-600">-</span>
                      <span className="max-w-[4.5rem] truncate">{m.away}</span>
                      <Flag src={m.awayFlag} className="h-4 w-4" />
                    </span>
                  )}
                </th>
                <th className="py-1 text-end font-semibold">{UI.point}</th>
              </tr>
            </thead>
            <tbody>
              {m.picks.map((p, i) => (
                <tr key={i} className="border-b border-white/[0.04] last:border-0">
                  <td className="py-1.5 text-slate-200">{p.name}</td>
                  <td className="py-1.5 text-center font-display tnum">
                    {p.home == null || p.away == null ? (
                      <span className="text-slate-600">—</span>
                    ) : winnerOnly ? (
                      <span className="font-sans font-semibold text-slate-100">{outcome(p.home, p.away)}</span>
                    ) : (
                      // Flex spans (not a string) so the home number follows the
                      // header's RTL order — home on the right, away on the left.
                      <span className="inline-flex items-center justify-center gap-1">
                        <span>{p.home}</span>
                        <span className="text-slate-600">-</span>
                        <span>{p.away}</span>
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 text-end">
                    {p.points != null && <span className="rounded bg-gold-500/15 px-1.5 py-0.5 text-xs font-bold text-gold-400">+{p.points}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
