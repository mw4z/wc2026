"use client";

import { Spinner } from "@/components/Spinner";

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { SerializedMatch, SerializedPrediction } from "@/app/(app)/matches/page";
import { useUI, useLocale } from "./I18nProvider";
import { playerDisplayName } from "@/lib/playerNames";
import { playGoal, playWhistle, playWin, playLose } from "@/lib/sounds";
import { ClockIcon, CheckIcon, LockIcon, UsersIcon, ArrowIcon, BallIcon } from "./icons";
import { Flag } from "./Flag";
import { MatchFormSheet } from "./MatchFormSheet";

const KNOCKOUT = new Set([
  "ROUND_OF_32",
  "ROUND_OF_16",
  "QUARTER_FINAL",
  "SEMI_FINAL",
  "THIRD_PLACE",
  "FINAL",
]);

// A live goal as returned by /api/matches/live (player name is Latin; localized
// to Arabic at render via playerDisplayName).
interface LiveGoal {
  side: string; // "home" | "away" (our orientation)
  player: string; // Latin name (fallback)
  playerAr?: string | null; // auto-resolved Arabic name when available
  minute: string;
  note: string | null; // "Penalty" | "Own Goal" | null
}

// A match counts as "in play" up to ~4h after kickoff (mirrors the server window).
const LIVE_WINDOW_MS = 4 * 3600_000;
// Live poll cadence — kept brisk so scores feel real-time. The endpoint is
// DB-backed and provider-throttled, so faster polling costs almost nothing.
const LIVE_POLL_MS = 20_000;

function useCountdown(target: string) {
  const [ms, setMs] = useState(() => new Date(target).getTime() - Date.now());
  useEffect(() => {
    const id = setInterval(() => setMs(new Date(target).getTime() - Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);
  return ms;
}

// The live clock comes straight from ESPN's status (e.g. "39'", "HT", "45+2'",
// "FT"). For a plain numeric minute we ANCHOR to ESPN's value and tick it locally
// each second so it advances smoothly between 20s polls instead of jumping; HT /
// stoppage / extra-time strings are shown verbatim (authoritative, never guessed).
// `statusAt` is when we received `status`; `nowMs` re-reads every render (1s tick).
function liveTimeLabel(
  status: string | null,
  statusAt: number,
  nowMs: number,
  kickoffISO: string,
  labels: {
    halftime: string;
    extraTime: string;
    live: string;
    delayed: string;
    postponed: string;
    suspended: string;
    abandoned: string;
    penalties: string;
  },
): string {
  const s = (status ?? "").trim();

  // Authoritative non-clock states from ESPN → Arabic labels (never raw English).
  if (/half|^ht$/i.test(s)) return labels.halftime;
  if (/^(et|extra)/i.test(s) || /extra\s*time/i.test(s)) return labels.extraTime;
  if (/penalt|shootout|^pens?\b/i.test(s)) return labels.penalties;
  if (/delay/i.test(s)) return labels.delayed;
  if (/postpon/i.test(s)) return labels.postponed;
  if (/suspend/i.test(s)) return labels.suspended;
  if (/abandon/i.test(s)) return labels.abandoned;
  if (/full|^ft\b/i.test(s)) return labels.live; // final → the poll triggers a refresh

  // Plain minute like "39'" / "39" → anchor and tick locally each second.
  const plain = s.match(/^(\d{1,3})'?$/);
  if (plain && statusAt > 0) {
    const ticked = Number(plain[1]) + Math.floor(Math.max(0, nowMs - statusAt) / 60000);
    return `${ticked}′`;
  }

  // Stoppage ("45+2'") or any clock-like value with digits → show as-is. A purely
  // textual ESPN status we don't recognize would otherwise leak English, so fall
  // through to the generic live label instead.
  if (/\d/.test(s)) return s;

  // No clock from ESPN yet → estimate from elapsed so the card isn't blank.
  const elapsed = Math.floor((nowMs - Date.parse(kickoffISO)) / 60000);
  if (!Number.isFinite(elapsed) || elapsed < 0) return labels.live;
  if (elapsed <= 45) return `${Math.max(1, elapsed)}′`;
  return `${elapsed}′`;
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
  live = false,
  clickable = false,
  goals = [],
}: {
  match: SerializedMatch;
  prediction: SerializedPrediction;
  // In-play: the match has kicked off but has no result yet. Shows the animated
  // LIVE pill + a breathing halo so it stands out at the top of the list.
  live?: boolean;
  // List context: lets a FINISHED card act as a button to its detail page (tap
  // anywhere → match details). Off on the detail page itself (you're already there).
  clickable?: boolean;
  // Goal scorers (server-provided, Arabic resolved) — shown under the final score
  // on finished matches and as the seed for live cards before the first poll.
  goals?: LiveGoal[];
}) {
  const UI = useUI();
  const locale = useLocale();
  const router = useRouter();
  const ms = useCountdown(match.kickoffAt);
  const msToOpen = useCountdown(match.opensAt ?? match.kickoffAt);
  const isKnockout = KNOCKOUT.has(match.stage);

  // Locked if status moved past SCHEDULED OR kickoff time reached (client mirror
  // of the server guard — the server is still the source of truth on submit).
  const locked = match.status !== "SCHEDULED" || ms <= 0;
  // In-play detection is CLIENT-REACTIVE so the card flips to LIVE the instant
  // kickoff is reached — no refresh needed. `ms` re-renders every second, so the
  // moment the countdown hits zero this recomputes, the LIVE pill appears, and the
  // polling effect below starts. Still gated on "no final result yet".
  const noFinalYet =
    match.homeScore == null && match.awayScore == null && match.status !== "SCORED" && match.status !== "CANCELLED";
  const sinceKickoff = Date.now() - Date.parse(match.kickoffAt);
  const withinLiveWindow = Number.isFinite(sinceKickoff) && sinceKickoff >= 0 && sinceKickoff <= LIVE_WINDOW_MS;
  const isLive = noFinalYet && (live || (ms <= 0 && withinLiveWindow));
  const teamsKnown = !!match.homeTeam && !!match.awayTeam;
  // Global prediction window: before opensAt, predictions aren't open yet.
  // (Re-evaluated each second via the countdown re-render, so it flips on time.)
  const notOpenYet = !locked && match.opensAt != null && Date.now() < Date.parse(match.opensAt);

  const finished = match.homeScore != null && match.awayScore != null;
  const homeWin = finished && match.homeScore! > match.awayScore!;
  const awayWin = finished && match.awayScore! > match.homeScore!;
  // A finished card in a list doubles as a button to its detail page.
  const cardClickable = clickable && finished && teamsKnown;
  const openDetail = () => router.push(`/matches/${match.id}`);

  const [home, setHome] = useState(prediction?.predictedHomeScore?.toString() ?? "");
  const [away, setAway] = useState(prediction?.predictedAwayScore?.toString() ?? "");
  const [winner, setWinner] = useState(prediction?.predictedWinnerTeamId ?? "");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  // True once this match has a saved prediction (prop or just-saved), so the
  // button reads "update" instead of "submit" and users aren't confused.
  const [submitted, setSubmitted] = useState(prediction != null);

  // Live (in-play) score: seeded from the server, then polled every ~40s while the
  // match is running. The endpoint is DB-backed + provider-throttled, so many cards
  // polling at once cost almost nothing. On "final" we refresh to get the scored card.
  const [liveScore, setLiveScore] = useState<{
    home: number | null;
    away: number | null;
    status: string | null;
    at: number;
    goals: LiveGoal[];
  }>({
    home: match.liveHomeScore,
    away: match.liveAwayScore,
    status: match.liveStatus,
    at: 0, // set on first poll; 0 means "don't tick the seeded minute yet"
    goals, // seed from the server; the live poll refreshes it
  });
  const endedRef = useRef(false);
  const goalsCountRef = useRef(goals.length);
  // Latest prediction, read inside the poll without restarting it on each render.
  const predictionRef = useRef(prediction);
  predictionRef.current = prediction;
  // Whistle when a match KICKS OFF while you're watching (isLive flips false→true).
  const wasLiveRef = useRef(isLive);
  useEffect(() => {
    if (isLive && !wasLiveRef.current) playWhistle();
    wasLiveRef.current = isLive;
  }, [isLive]);
  useEffect(() => {
    if (!isLive) return;
    endedRef.current = false;
    let active = true;
    const tick = async () => {
      if (endedRef.current) return;
      try {
        const res = await fetch("/api/matches/live", { cache: "no-store" });
        if (!res.ok || !active) return;
        const data = (await res.json()) as {
          matches?: {
            id: string;
            home: number | null;
            away: number | null;
            status: string | null;
            final: boolean;
            goals?: LiveGoal[];
          }[];
        };
        const mine = data.matches?.find((x) => x.id === match.id);
        if (!mine || !active) return;
        if (mine.final) {
          endedRef.current = true;
          // Result sound for the match you were watching: win if your predicted
          // outcome matched the final, otherwise the "missed" sound.
          const pred = predictionRef.current;
          if (pred && mine.home != null && mine.away != null) {
            const predOutcome = Math.sign(pred.predictedHomeScore - pred.predictedAwayScore);
            const realOutcome = Math.sign(mine.home - mine.away);
            if (predOutcome === realOutcome) playWin();
            else playLose();
          }
          router.refresh(); // match ended → pull the finished/scored card
          return;
        }
        const nextGoals = mine.goals ?? [];
        // A new goal arrived this poll → celebratory sound (muteable in profile).
        if (nextGoals.length > goalsCountRef.current) playGoal();
        goalsCountRef.current = nextGoals.length;
        setLiveScore({ home: mine.home, away: mine.away, status: mine.status, at: Date.now(), goals: nextGoals });
      } catch {
        /* keep the last score on a transient error */
      }
    };
    tick();
    const iv = setInterval(tick, LIVE_POLL_MS);
    return () => {
      active = false;
      clearInterval(iv);
    };
  }, [isLive, match.id, router]);
  const showLiveScore = isLive && liveScore.home != null && liveScore.away != null;

  async function save() {
    setMsg(null);

    // Always store the real predicted goals. Winner-only is a GROUP scoring rule
    // (the group counts only the correct outcome) — it never changes what we save,
    // so these users still keep their exact score for the general leaderboard.
    const hScore = Number(home);
    const aScore = Number(away);
    const winnerId: string | null = isKnockout ? winner || null : null;

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
    <div
      className={`card edge-accent reveal transition duration-200 ${
        cardClickable
          ? "cursor-pointer hover:border-accent-500/40 hover:shadow-[0_0_24px_rgba(56,189,248,0.10)] active:scale-[0.99]"
          : "hover:border-white/20"
      } ${isLive ? "card-live" : ""}`}
      {...(cardClickable
        ? {
            role: "link" as const,
            tabIndex: 0,
            "aria-label": UI.viewMatchDetails,
            onClick: openDetail,
            onKeyDown: (e: ReactKeyboardEvent) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openDetail();
              }
            },
          }
        : {})}
    >
      {/* top strip */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
        <Link
          href={`/matches/${match.id}`}
          onClick={(e) => e.stopPropagation()}
          className="text-xs font-bold text-slate-400 transition hover:text-accent-400"
        >
          #{match.matchNumber} · {UI.stages[match.stage]}
        </Link>
        <StatusPill status={match.status} locked={locked} finished={finished} notOpenYet={notOpenYet} live={isLive} />
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
          ) : showLiveScore ? (
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-2 font-display text-4xl font-extrabold tnum leading-none text-lime-300">
                <span>{liveScore.home}</span>
                <span className="text-slate-600">:</span>
                <span>{liveScore.away}</span>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-lime-400">
                <span className="relative flex h-1.5 w-1.5" aria-hidden>
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-lime-400" />
                </span>
                {liveTimeLabel(liveScore.status, liveScore.at, Date.now(), match.kickoffAt, {
                  halftime: UI.halftime,
                  extraTime: UI.extraTime,
                  live: UI.statuses.LIVE,
                  delayed: UI.statusDelayed,
                  postponed: UI.statusPostponed,
                  suspended: UI.statusSuspended,
                  abandoned: UI.statusAbandoned,
                  penalties: UI.statusPenalties,
                })}
              </span>
            </div>
          ) : (
            <span className="font-display text-sm font-bold uppercase tracking-widest2 text-slate-500">
              {UI.vs}
            </span>
          )}
        </div>
        <TeamSide name={match.awayTeam?.name ?? UI.tbd} flag={match.awayTeam?.flagUrl} win={awayWin} />
      </div>

      {/* scorers — player + minute under the score, aligned to each team. Shown
          while live AND on finished matches (final score above). */}
      {(() => {
        const shown = isLive ? liveScore.goals : goals;
        if (!(showLiveScore || finished) || shown.length === 0) return null;
        return (
          <div className="mt-1 flex items-start justify-between gap-4 border-t border-white/[0.06] px-4 py-3">
            <ScorerList goals={shown.filter((g) => g.side === "home")} locale={locale} align="start" />
            <ScorerList goals={shown.filter((g) => g.side === "away")} locale={locale} align="end" />
          </div>
        );
      })()}

      {/* meta */}
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 pb-1 text-center text-xs text-slate-300">
        <span className="inline-flex items-center gap-1">
          <ClockIcon className="text-[13px] text-accent-400" />
          {match.kickoffLabel}
        </span>
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
            {/* Two distinct actions: the live lineup/Match Center, and the match's
                prediction details. Stop clicks bubbling to a clickable card. */}
            <div onClick={(e) => e.stopPropagation()}>
              <Link
                href={`/matches/${match.id}#match-center`}
                className="btn-ghost mt-3 inline-flex w-full items-center justify-center gap-1.5 border-accent-500/40 text-sm text-accent-300"
              >
                <BallIcon className="text-base" />
                {UI.viewLineups}
              </Link>
              <Link
                href={`/matches/${match.id}/predictions`}
                className="btn-ghost mt-2 inline-flex w-full items-center justify-center gap-1.5 text-sm"
              >
                <UsersIcon className="text-base" />
                {UI.viewMatchPredictions}
              </Link>
            </div>
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
              disabled={saving || home === "" || away === ""}
              className="btn-primary w-full"
            >
              {saving ? <Spinner /> : submitted ? UI.updatePrediction : UI.submitPrediction}
            </button>
          </div>
        )}
      </div>

      {/* Recent results sheet — each team's last few games, to help users predict. */}
      {teamsKnown && (
        <div className="border-t border-white/[0.06] px-4 pb-3" onClick={(e) => e.stopPropagation()}>
          <MatchFormSheet
            matchId={match.id}
            homeName={match.homeTeam!.name}
            awayName={match.awayTeam!.name}
            homeFlag={match.homeTeam!.flagUrl}
            awayFlag={match.awayTeam!.flagUrl}
          />
        </div>
      )}

      {/* Tap affordance — makes it obvious a finished card opens its detail page. */}
      {cardClickable && (
        <div className="flex items-center justify-center gap-1 border-t border-white/[0.06] py-2.5 text-xs font-bold text-accent-400">
          {UI.viewMatchDetails}
          <ArrowIcon className="text-sm rtl:-scale-x-100" />
        </div>
      )}
    </div>
  );
}

// "See members' predictions" once a match starts. One group → direct link;
// multiple groups → tap to expand and pick which group's board to open.
export function GroupPicksButton({ groups }: { groups: { id: string; name: string }[] }) {
  const UI = useUI();
  const [open, setOpen] = useState(false);
  if (groups.length === 0) return null;

  if (groups.length === 1) {
    return (
      <Link
        href={`/groups/${groups[0]!.id}/predictions`}
        className="btn-ghost mt-3 inline-flex w-full items-center justify-center gap-1.5 text-sm"
      >
        <UsersIcon className="text-base" />
        {UI.viewGroupPredictions}
      </Link>
    );
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="btn-ghost inline-flex w-full items-center justify-center gap-1.5 text-sm"
      >
        <UsersIcon className="text-base" />
        {UI.viewGroupPredictions}
        <span className="text-xs text-slate-500">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="mt-2 space-y-1">
          {groups.map((g) => (
            <Link
              key={g.id}
              href={`/groups/${g.id}/predictions`}
              className="block truncate rounded-lg border border-white/10 px-3 py-2 text-center text-sm text-slate-200 transition hover:border-white/25 hover:bg-white/5"
            >
              {g.name}
            </Link>
          ))}
        </div>
      )}
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
  const scored = prediction.pointsAwarded != null;

  // Scored: prediction on one side, the points pill fills the other → balanced.
  if (scored) {
    return (
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs text-slate-400">{UI.yourPrediction}</div>
          <div className="inline-flex items-center gap-1.5 font-display text-lg font-bold tnum text-white">
            <span>{prediction.predictedHomeScore}</span>
            <span className="text-slate-600">:</span>
            <span>{prediction.predictedAwayScore}</span>
          </div>
          {winnerName && <div className="text-xs text-slate-400">{UI.qualifierLabel} {winnerName}</div>}
        </div>
        <div className="rounded-lg bg-gold-500/15 px-3 py-1.5 text-center">
          <div className="font-display text-lg font-extrabold tnum text-gold-400">
            +{prediction.pointsAwarded}
          </div>
          <div className="text-[10px] text-gold-400/80">{UI.point}</div>
        </div>
      </div>
    );
  }

  // Not scored yet — center it so there's no stranded empty space.
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <div className="flex items-baseline gap-2">
        <span className="text-xs text-slate-400">{UI.yourPrediction}</span>
        <span className="inline-flex items-center gap-1.5 font-display text-lg font-bold tnum text-white">
          <span>{prediction.predictedHomeScore}</span>
          <span className="text-slate-600">:</span>
          <span>{prediction.predictedAwayScore}</span>
        </span>
      </div>
      {winnerName && <div className="text-xs text-slate-400">{UI.qualifierLabel} {winnerName}</div>}
    </div>
  );
}

function StatusPill({
  status,
  locked,
  finished,
  notOpenYet,
  live = false,
}: {
  status: SerializedMatch["status"];
  locked: boolean;
  finished: boolean;
  notOpenYet: boolean;
  live?: boolean;
}) {
  const UI = useUI();
  // In play (kicked off, no result yet) → the animated LIVE pill, top priority.
  if (live && !finished) {
    return (
      <span className="pill pill-live animate-live">
        <span className="pill-dot" />
        {UI.statuses.LIVE}
      </span>
    );
  }
  // Scheduled but the prediction window hasn't opened yet → don't show "open".
  if (notOpenYet && !finished) {
    return <span className="pill pill-locked">{UI.notOpenYet}</span>;
  }
  // SCORED takes priority: a match with calculated points shows "تم احتساب
  // النقاط", not "بانتظار النتيجة" (FINISHED).
  const effective =
    status === "SCORED"
      ? "SCORED"
      : finished
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

function ScorerList({
  goals,
  locale,
  align,
}: {
  goals: LiveGoal[];
  locale: string;
  align: "start" | "end";
}) {
  if (goals.length === 0) return <div className="flex-1" />;
  // Home column (start) puts the ball on the right (outer) edge, away on the left —
  // each row is a DETERMINISTIC ltr flex so the minute never bidi-flips between
  // Arabic and Latin names; the name itself is bdi-isolated so it still renders
  // correctly in either script.
  const home = align === "start";
  return (
    <ul className={`flex flex-1 flex-col gap-1.5 ${home ? "items-start" : "items-end"}`}>
      {goals.map((g, i) => (
        <li
          key={i}
          dir="ltr"
          className={`flex items-center gap-1.5 text-xs text-slate-300 ${home ? "flex-row-reverse" : ""}`}
        >
          <span aria-hidden className="text-[13px] leading-none">⚽</span>
          <bdi className="font-medium text-slate-200">
            {locale === "ar" ? g.playerAr || playerDisplayName(g.player, locale) : g.player}
          </bdi>
          {g.minute && <span className="tnum text-slate-500">{g.minute}</span>}
          {g.note && (
            <span
              title={g.note === "Penalty" ? "ركلة جزاء" : "هدف عكسي"}
              className="rounded bg-white/10 px-1 text-[9px] font-bold leading-none text-slate-400"
            >
              {g.note === "Penalty" ? "P" : "OG"}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
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
