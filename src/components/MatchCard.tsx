"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { SerializedMatch, SerializedPrediction } from "@/app/(app)/matches/page";
import { useUI } from "./I18nProvider";
import { ClockIcon, CheckIcon, LockIcon } from "./icons";
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
  return d > 0 ? `${d}ي ${pad(h)}:${pad(m)}` : `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

export function MatchCard({
  match,
  prediction,
}: {
  match: SerializedMatch;
  prediction: SerializedPrediction;
}) {
  const UI = useUI();
  const router = useRouter();
  const ms = useCountdown(match.kickoffAt);
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
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setMsg(null);
    setSaving(true);
    try {
      const res = await fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: match.id,
          predictedHomeScore: Number(home),
          predictedAwayScore: Number(away),
          predictedWinnerTeamId: isKnockout ? winner || null : null,
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
        <StatusPill status={match.status} locked={locked} finished={finished} />
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
      <div className="flex flex-wrap items-center justify-center gap-2 px-4 pb-1 text-center text-xs text-slate-400">
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
          <LockedView prediction={prediction} isKnockout={isKnockout} match={match} />
        ) : notOpenYet ? (
          <div className="text-center text-sm">
            <p className="font-semibold text-slate-300">{UI.notOpenYet}</p>
            {match.opensAtLabel && (
              <p className="mt-1 text-xs text-slate-500">
                {UI.opensAtLabel}: {match.opensAtLabel}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="flex items-center justify-center gap-1.5 text-center text-xs text-slate-400">
              <LockIcon className="text-sm" />
              {UI.closesAtKickoff}
            </p>
            <div className="flex items-center justify-center gap-3">
              <ScoreInput value={home} onChange={setHome} label={match.homeTeam!.name} />
              <span className="font-display text-xl text-slate-600">:</span>
              <ScoreInput value={away} onChange={setAway} label={match.awayTeam!.name} />
            </div>

            {isKnockout && (
              <div>
                <label className="label text-center">{UI.predictedWinner}</label>
                <div className="flex gap-2">
                  {[match.homeTeam!, match.awayTeam!].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setWinner(t.id)}
                      className={`flex-1 rounded-lg border px-2 py-2 text-sm font-semibold transition ${
                        winner === t.id
                          ? "border-accent-500 bg-accent-500/15 text-accent-400"
                          : "border-white/10 text-slate-300 hover:border-white/25"
                      }`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {msg && (
              <p
                className={`flex items-center justify-center gap-1.5 text-center text-sm ${
                  msg.type === "ok" ? "text-lime-400" : "text-red-300"
                }`}
              >
                {msg.type === "ok" && <CheckIcon className="text-base" />}
                {msg.text}
              </p>
            )}

            <button onClick={save} disabled={saving || home === "" || away === ""} className="btn-primary w-full">
              {saving ? "..." : UI.submitPrediction}
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
}: {
  status: SerializedMatch["status"];
  locked: boolean;
  finished: boolean;
}) {
  const UI = useUI();
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
