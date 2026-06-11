"use client";

import { Spinner } from "@/components/Spinner";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { SerializedMatch, SerializedPrediction } from "@/app/(app)/matches/page";
import { useUI } from "./I18nProvider";
import { ClockIcon, CheckIcon, LockIcon, UsersIcon } from "./icons";
import { Flag } from "./Flag";

const KNOCKOUT = new Set([
  "ROUND_OF_32",
  "ROUND_OF_16",
  "QUARTER_FINAL",
  "SEMI_FINAL",
  "THIRD_PLACE",
  "FINAL",
]);

function useCountdown(target: string) {
  const [ms, setMs] = useState(() => new Date(target).getTime() - Date.now());
  useEffect(() => {
    const id = setInterval(() => setMs(new Date(target).getTime() - Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);
  return ms;
}

function fmtCountdown(ms: number) {
  if (ms <= 0) return "00:00:00";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return d > 0 ? `${d}ي ${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

export function MatchCard({
  match,
  prediction,
  winnerOnly = false,
  groupId = null,
}: {
  match: SerializedMatch;
  prediction: SerializedPrediction;
  // True when ALL of the viewer's groups are winner-only: show a result picker
  // instead of goal boxes. The stored score is a placeholder (1-0 / 0-0 / 0-1).
  winnerOnly?: boolean;
  // The viewer's group (if any) — once the match starts, link to that group's
  // revealed member predictions for this match.
  groupId?: string | null;
}) {
  const UI = useUI();
  const router = useRouter();
  const ms = useCountdown(match.kickoffAt);
  const msToOpen = useCountdown(match.opensAt ?? match.kickoffAt);
  const isKnockout = KNOCKOUT.has(match.stage);

  // Locked if status moved past SCHEDULED OR kickoff time reached (client mirror
  // of the server guard — the server is still the source of truth on submit).
  const locked = match.status !== "SCHEDULED" || ms <= 0;
  const teamsKnown = !!match.homeTeam && !!match.awayTeam;
  // Global prediction window: before opensAt, predictions aren't open yet.
  // (Re-evaluated each second via the countdown re-render, so it flips on time.)
  const notOpenYet = !locked && match.opensAt != null && Date.now() < Date.parse(match.opensAt);

  const finished = match.homeScore != null && match.awayScore != null;
  const homeWin = finished && match.homeScore! > match.awayScore!;
  const awayWin = finished && match.awayScore! > match.homeScore!;

  const [home, setHome] = useState(prediction?.predictedHomeScore?.toString() ?? "");
  const [away, setAway] = useState(prediction?.predictedAwayScore?.toString() ?? "");
  const [winner, setWinner] = useState(prediction?.predictedWinnerTeamId ?? "");
  // Winner-only group-stage selection ("" until chosen), derived from any score.
  const [outcome, setOutcome] = useState<"HOME" | "DRAW" | "AWAY" | "">(() => {
    if (!prediction) return "";
    if (prediction.predictedHomeScore > prediction.predictedAwayScore) return "HOME";
    if (prediction.predictedHomeScore < prediction.predictedAwayScore) return "AWAY";
    return "DRAW";
  });
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  // True once this match has a saved prediction (prop or just-saved), so the
  // button reads "update" instead of "submit" and users aren't confused.
  const [submitted, setSubmitted] = useState(prediction != null);

  async function save() {
    setMsg(null);

    // In winner-only mode the score is a placeholder derived from the pick:
    // knockout → chosen team wins 1-0; group stage → HOME 1-0 / DRAW 0-0 / AWAY 0-1.
    let hScore = Number(home);
    let aScore = Number(away);
    let winnerId: string | null = isKnockout ? winner || null : null;
    if (winnerOnly) {
      if (isKnockout) {
        if (!winner) {
          setMsg({ type: "err", text: UI.predictedWinner });
          return;
        }
        winnerId = winner;
        hScore = winner === match.homeTeam!.id ? 1 : 0;
        aScore = winner === match.awayTeam!.id ? 1 : 0;
      } else {
        if (!outcome) {
          setMsg({ type: "err", text: UI.whoWins });
          return;
        }
        hScore = outcome === "HOME" ? 1 : 0;
        aScore = outcome === "AWAY" ? 1 : 0;
      }
    }

    setSaving(true);
    try {
      const res = await fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: match.id,
          predictedHomeScore: hScore,
          predictedAwayScore: aScore,
          predictedWinnerTeamId: winnerId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ type: "err", text: data.error || UI.saveFailed });
        if (
          data.code === "KICKOFF_REACHED" ||
          data.code === "MATCH_NOT_OPEN" ||
          data.code === "PREDICTION_NOT_OPEN_YET"
        ) {
          router.refresh();
        }
        return;
      }
      setMsg({ type: "ok", text: UI.predictionSaved });
      setSubmitted(true);
      router.refresh();
    } catch {
      setMsg({ type: "err", text: UI.connError });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card edge-accent reveal transition duration-200 hover:border-white/20">
      {/* top strip */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
        <Link
          href={`/matches/${match.id}`}
          className="text-xs font-bold text-slate-400 transition hover:text-accent-400"
        >
          #{match.matchNumber} · {UI.stages[match.stage]}
        </Link>
        <StatusPill status={match.status} locked={locked} finished={finished} notOpenYet={notOpenYet} />
      </div>

      {/* scoreline */}
      <div className="flex items-center justify-between gap-2 px-4 py-5">
        <TeamSide name={match.homeTeam?.name ?? UI.tbd} flag={match.homeTeam?.flagUrl} win={homeWin} />
        <div className="flex min-w-[72px] flex-col items-center">
          {finished ? (
            <div className="flex items-center gap-2 font-display text-4xl font-extrabold tnum leading-none">
              <span className={homeWin ? "text-gold-400" : "text-white"}>{match.homeScore}</span>
              <span className="text-slate-600">:</span>
              <span className={awayWin ? "text-gold-400" : "text-white"}>{match.awayScore}</span>
            </div>
          ) : (
            <span className="font-display text-sm font-bold uppercase tracking-widest2 text-slate-500">
              {UI.vs}
            </span>
          )}
        </div>
        <TeamSide name={match.awayTeam?.name ?? UI.tbd} flag={match.awayTeam?.flagUrl} win={awayWin} />
      </div>

      {/* meta */}
      <div className="flex flex-wrap items-center justify-center gap-2 px-4 pb-1 text-center text-xs text-slate-300">
        {match.stadium && (
          <span>
            {match.stadium}
            {match.city ? ` · ${match.city}` : ""}
          </span>
        )}
        {!locked && teamsKnown && (
          <span className="pill pill-scheduled">
            <ClockIcon className="text-[13px]" />
            <span className="tnum">{fmtCountdown(ms)}</span>
          </span>
        )}
      </div>

      {/* prediction area */}
      <div className="mt-3 border-t border-white/[0.06] p-4">
        {!teamsKnown ? (
          <p className="text-center text-sm text-slate-500">{UI.teamsTbd}</p>
        ) : locked ? (
          <>
            <LockedView prediction={prediction} isKnockout={isKnockout} match={match} />
            {groupId && (
              <Link
                href={`/groups/${groupId}/predictions`}
                className="btn-ghost mt-3 inline-flex w-full items-center justify-center gap-1.5 text-sm"
              >
                <UsersIcon className="text-base" />
                {UI.viewGroupPredictions}
              </Link>
            )}
          </>
        ) : notOpenYet ? (
          <div className="flex flex-col items-center gap-2 text-center text-sm">
            <p className="font-semibold text-slate-300">{UI.notOpenYet}</p>
            <span className="pill pill-locked">
              <ClockIcon className="text-[13px]" />
              {UI.opensIn} <span className="tnum">{fmtCountdown(msToOpen)}</span>
            </span>
            {match.opensAtLabel && (
              <p className="text-xs text-slate-500">
                {UI.opensAtLabel}: {match.opensAtLabel}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="flex items-center justify-center gap-1.5 text-center text-xs text-slate-300">
              <LockIcon className="text-sm" />
              {UI.closesAtKickoff}
            </p>

            {winnerOnly ? (
              // Result picker (no goals): all of the viewer's groups are winner-only.
              <div>
                <p className="mb-2 text-center text-xs text-slate-500">{UI.winnerOnlyInputHint}</p>
                {isKnockout ? (
                  <div className="flex gap-2">
                    {[match.homeTeam!, match.awayTeam!].map((t) => (
                      <PickButton key={t.id} active={winner === t.id} onClick={() => setWinner(t.id)} label={t.name} />
                    ))}
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <PickButton active={outcome === "HOME"} onClick={() => setOutcome("HOME")} label={match.homeTeam!.name} />
                    <PickButton active={outcome === "DRAW"} onClick={() => setOutcome("DRAW")} label={UI.outcomeDraw} />
                    <PickButton active={outcome === "AWAY"} onClick={() => setOutcome("AWAY")} label={match.awayTeam!.name} />
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Each score input sits directly under its team (mirrors the
                    scoreline above), so it's unambiguous which score is whose. */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-1 flex-col items-center gap-1.5">
                    <ScoreInput value={home} onChange={setHome} label={match.homeTeam!.name} />
                    <span className="max-w-full truncate text-[11px] font-semibold text-slate-400">
                      {match.homeTeam!.name}
                    </span>
                  </div>
                  <div className="flex min-w-[72px] items-center justify-center pt-3">
                    <span className="font-display text-xl text-slate-600">:</span>
                  </div>
                  <div className="flex flex-1 flex-col items-center gap-1.5">
                    <ScoreInput value={away} onChange={setAway} label={match.awayTeam!.name} />
                    <span className="max-w-full truncate text-[11px] font-semibold text-slate-400">
                      {match.awayTeam!.name}
                    </span>
                  </div>
                </div>

                {isKnockout && (
                  <div>
                    <label className="label text-center">{UI.predictedWinner}</label>
                    <div className="flex gap-2">
                      {[match.homeTeam!, match.awayTeam!].map((t) => (
                        <PickButton key={t.id} active={winner === t.id} onClick={() => setWinner(t.id)} label={t.name} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {msg ? (
              <p
                className={`flex items-center justify-center gap-1.5 text-center text-sm ${
                  msg.type === "ok" ? "text-lime-400" : "text-red-300"
                }`}
              >
                {msg.type === "ok" && <CheckIcon className="text-base" />}
                {msg.text}
              </p>
            ) : (
              submitted && (
                // Persistent, quiet reassurance — clear but doesn't compete with the CTA.
                <p className="flex items-center justify-center gap-1 text-center text-[11px] font-medium text-lime-300/75">
                  <CheckIcon className="text-xs" />
                  {UI.predictionSaved}
                </p>
              )
            )}

            <button
              onClick={save}
              disabled={
                saving ||
                (winnerOnly ? (isKnockout ? !winner : !outcome) : home === "" || away === "")
              }
              className="btn-primary w-full"
            >
              {saving ? <Spinner /> : submitted ? UI.updatePrediction : UI.submitPrediction}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function LockedView({
  prediction,
  isKnockout,
  match,
}: {
  prediction: SerializedPrediction;
  isKnockout: boolean;
  match: SerializedMatch;
}) {
  const UI = useUI();
  if (!prediction) {
    return (
      <p className="text-center text-sm text-slate-500">
        {UI.predictionClosed} — {UI.notPredicted}
      </p>
    );
  }
  const winnerName =
    isKnockout && prediction.predictedWinnerTeamId
      ? prediction.predictedWinnerTeamId === match.homeTeam?.id
        ? match.homeTeam?.name
        : match.awayTeam?.name
      : null;
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <div className="text-xs text-slate-400">{UI.yourPrediction}</div>
        <div className="font-display text-lg font-bold tnum text-white">
          {prediction.predictedHomeScore} : {prediction.predictedAwayScore}
        </div>
        {winnerName && <div className="text-xs text-slate-400">{UI.qualifierLabel} {winnerName}</div>}
      </div>
      {prediction.pointsAwarded != null && (
        <div className="rounded-lg bg-gold-500/15 px-3 py-1.5 text-center">
          <div className="font-display text-lg font-extrabold tnum text-gold-400">
            +{prediction.pointsAwarded}
          </div>
          <div className="text-[10px] text-gold-400/80">{UI.point}</div>
        </div>
      )}
    </div>
  );
}

function StatusPill({
  status,
  locked,
  finished,
  notOpenYet,
}: {
  status: SerializedMatch["status"];
  locked: boolean;
  finished: boolean;
  notOpenYet: boolean;
}) {
  const UI = useUI();
  // Scheduled but the prediction window hasn't opened yet → don't show "open".
  if (notOpenYet && !finished) {
    return <span className="pill pill-locked">{UI.notOpenYet}</span>;
  }
  const effective = finished
    ? "FINISHED"
    : status === "SCHEDULED" && locked
      ? "LOCKED"
      : status;

  if (effective === "LIVE") {
    return (
      <span className="pill pill-live animate-live">
        <span className="pill-dot" />
        {UI.statuses.LIVE}
      </span>
    );
  }
  const cls: Record<string, string> = {
    SCHEDULED: "pill-scheduled",
    LOCKED: "pill-locked",
    FINISHED: "pill-done",
    SCORED: "pill-done",
    CANCELLED: "pill-done",
  };
  return <span className={`pill ${cls[effective] ?? "pill-done"}`}>{UI.statuses[effective]}</span>;
}

function TeamSide({ name, flag, win }: { name: string; flag?: string | null; win?: boolean }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-2 text-center">
      <Flag src={flag} className={`h-12 w-12 ${win ? "ring-2 ring-gold-400" : ""}`} />
      <span className={`text-sm font-bold leading-tight ${win ? "text-gold-300" : "text-slate-100"}`}>
        {name}
      </span>
    </div>
  );
}

function PickButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-lg border px-2 py-2 text-sm font-semibold transition ${
        active
          ? "border-accent-500 bg-accent-500/15 text-accent-400"
          : "border-white/10 text-slate-300 hover:border-white/25"
      }`}
    >
      {label}
    </button>
  );
}

function ScoreInput({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <input
      type="number"
      min={0}
      max={99}
      inputMode="numeric"
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="input font-display w-16 text-center text-2xl font-extrabold tnum"
    />
  );
}
