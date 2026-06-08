"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { SerializedMatch, SerializedPrediction } from "@/app/(app)/matches/page";
import { STAGE_LABEL_AR, STATUS_LABEL_AR, UI } from "@/lib/constants";

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
}: {
  match: SerializedMatch;
  prediction: SerializedPrediction;
}) {
  const router = useRouter();
  const ms = useCountdown(match.kickoffAt);
  const isKnockout = KNOCKOUT.has(match.stage);

  // Locked if status moved past SCHEDULED OR kickoff time reached (client mirror
  // of the server guard — the server is still the source of truth on submit).
  const locked = match.status !== "SCHEDULED" || ms <= 0;
  const teamsKnown = !!match.homeTeam && !!match.awayTeam;

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
        setMsg({ type: "err", text: data.error || "تعذّر الحفظ" });
        if (data.code === "KICKOFF_REACHED" || data.code === "MATCH_NOT_OPEN") {
          router.refresh();
        }
        return;
      }
      setMsg({ type: "ok", text: "تم حفظ توقعك ✔" });
      router.refresh();
    } catch {
      setMsg({ type: "err", text: "تعذّر الاتصال بالخادم" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between text-xs text-slate-400">
        <span>
          #{match.matchNumber} · {STAGE_LABEL_AR[match.stage]}
        </span>
        <StatusBadge status={match.status} locked={locked} />
      </div>

      <div className="flex items-center justify-between gap-2">
        <TeamSide name={match.homeTeam?.nameAr ?? "يُحدد"} flag={match.homeTeam?.flagUrl} />
        <div className="text-center">
          {match.homeScore != null && match.awayScore != null ? (
            <div className="text-2xl font-extrabold text-gold-400">
              {match.homeScore} : {match.awayScore}
            </div>
          ) : (
            <div className="text-xl font-bold text-slate-500">{UI.vs}</div>
          )}
        </div>
        <TeamSide name={match.awayTeam?.nameAr ?? "يُحدد"} flag={match.awayTeam?.flagUrl} />
      </div>

      <div className="mt-3 space-y-0.5 text-center text-xs text-slate-400">
        {match.stadium && <div>{match.stadium}{match.city ? ` · ${match.city}` : ""}</div>}
        {!locked && teamsKnown && (
          <div className="text-gold-400">
            {UI.locksIn}: <span className="font-mono">{fmtCountdown(ms)}</span>
          </div>
        )}
      </div>

      {/* Prediction area */}
      <div className="mt-4 border-t border-navy-700 pt-4">
        {!teamsKnown ? (
          <p className="text-center text-sm text-slate-500">لم يتم تحديد الفريقين بعد</p>
        ) : locked ? (
          <LockedView prediction={prediction} isKnockout={isKnockout} match={match} />
        ) : (
          <div className="space-y-3">
            <p className="text-center text-xs text-slate-400">{UI.closesAtKickoff}</p>
            <div className="flex items-center justify-center gap-3">
              <ScoreInput value={home} onChange={setHome} label={match.homeTeam!.nameAr} />
              <span className="text-slate-500">:</span>
              <ScoreInput value={away} onChange={setAway} label={match.awayTeam!.nameAr} />
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
                      className={`flex-1 rounded-lg border px-2 py-1.5 text-sm ${
                        winner === t.id
                          ? "border-gold-500 bg-gold-500/15 text-gold-300"
                          : "border-navy-600 text-slate-300"
                      }`}
                    >
                      {t.nameAr}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {msg && (
              <p className={`text-center text-sm ${msg.type === "ok" ? "text-ok" : "text-red-300"}`}>
                {msg.text}
              </p>
            )}

            <button
              onClick={save}
              disabled={saving || home === "" || away === ""}
              className="btn-gold w-full"
            >
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
  if (!prediction) {
    return <p className="text-center text-sm text-slate-500">{UI.predictionClosed} — لم تتوقع</p>;
  }
  const winnerName =
    isKnockout && prediction.predictedWinnerTeamId
      ? prediction.predictedWinnerTeamId === match.homeTeam?.id
        ? match.homeTeam?.nameAr
        : match.awayTeam?.nameAr
      : null;
  return (
    <div className="text-center text-sm">
      <div className="text-slate-400">{UI.yourPrediction}</div>
      <div className="text-lg font-bold">
        {prediction.predictedHomeScore} : {prediction.predictedAwayScore}
      </div>
      {winnerName && <div className="text-slate-400">المتأهل: {winnerName}</div>}
      {prediction.pointsAwarded != null && (
        <div className="mt-1 font-bold text-gold-400">+{prediction.pointsAwarded} نقطة</div>
      )}
    </div>
  );
}

function StatusBadge({ status, locked }: { status: SerializedMatch["status"]; locked: boolean }) {
  const colors: Record<string, string> = {
    SCHEDULED: "bg-ok/20 text-green-300",
    LOCKED: "bg-warn/20 text-amber-300",
    LIVE: "bg-danger/20 text-red-300",
    FINISHED: "bg-navy-600 text-slate-300",
    SCORED: "bg-gold-500/20 text-gold-300",
    CANCELLED: "bg-navy-600 text-slate-400",
  };
  const effective = status === "SCHEDULED" && locked ? "LOCKED" : status;
  return <span className={`badge ${colors[effective]}`}>{STATUS_LABEL_AR[effective]}</span>;
}

function TeamSide({ name, flag }: { name: string; flag?: string | null }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1 text-center">
      {flag ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={flag} alt="" className="h-8 w-8 rounded-full object-cover" />
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-700 text-xs">
          ?
        </div>
      )}
      <span className="text-sm font-semibold">{name}</span>
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
      className="input w-16 text-center text-xl font-bold"
    />
  );
}
