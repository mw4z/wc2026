"use client";

import { useState } from "react";
import Link from "next/link";
import { useUI } from "@/components/I18nProvider";
import { Flag } from "@/components/Flag";
import { WhatsAppIcon } from "@/components/icons";

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
  upcoming,
  revealed,
  roster,
}: {
  groupId: string;
  groupName: string;
  groupCode: string;
  isLeader: boolean;
  upcoming: MatchView[];
  revealed: MatchView[];
  roster: RosterEntry[];
}) {
  const UI = useUI();
  const [notifyMsg, setNotifyMsg] = useState<string | null>(null);
  const [notifying, setNotifying] = useState(false);

  function remind() {
    const link = `${window.location.origin}/join/${groupCode}`;
    const msg = `تذكير ⚽\nلا تنسوا تسجيل توقعاتكم قبل بداية المباريات!\nرابط المجموعة:\n${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
  }

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

      {/* Roster: who is behind on upcoming predictions (clear who hasn't voted). */}
      {roster.length > 0 && upcoming.length > 0 && (
        <div className="card mb-6 p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="eyebrow">{UI.predictionStatus}</span>
            {isLeader && (
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={remind} className="action-btn is-wa w-auto px-3 py-1.5">
                  <WhatsAppIcon className="ab-ic" />
                  {UI.remindToPredict}
                </button>
                <button onClick={notifyPending} disabled={notifying || behind.length === 0} className="btn-primary px-3 py-1.5 text-sm">
                  {notifying ? UI.notifying : UI.notifyPending}
                </button>
              </div>
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
            {revealed.map((m) => <RevealedRow key={m.id} m={m} />)}
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
        <span className="font-display tnum text-gold-300">{m.homeScore}-{m.awayScore}</span>
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

function RevealedRow({ m }: { m: MatchView }) {
  const UI = useUI();
  const [open, setOpen] = useState(false);
  return (
    <div className="card p-3">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-3 text-start">
        <MatchHeader m={m} />
        <span className="shrink-0 text-xs text-slate-500">{open ? "▲" : "▼"}</span>
      </button>
      {open && m.picks && (
        <div className="mt-2 border-t border-white/[0.06] pt-2">
          <table className="w-full text-sm">
            <tbody>
              {m.picks.map((p, i) => (
                <tr key={i} className="border-b border-white/[0.04] last:border-0">
                  <td className="py-1.5 text-slate-200">{p.name}</td>
                  <td className="py-1.5 text-center font-display tnum">
                    {p.home != null && p.away != null ? `${p.home}-${p.away}` : <span className="text-slate-600">—</span>}
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
