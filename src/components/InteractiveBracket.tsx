"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUI, useLocale } from "./I18nProvider";
import { Flag } from "./Flag";
import type { BracketRound, BracketMatch, BracketTeam } from "@/lib/standings";

const UNIT = 92; // vertical band per first-round match (sets column height + alignment)
const DISPLAY_TZ = process.env.NEXT_PUBLIC_DISPLAY_TZ || "Asia/Riyadh";

// Short "day month · HH:MM" for a bracket match, in the user's locale/timezone.
function kickoffLabel(iso: string, locale: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: DISPLAY_TZ }).format(d);
  const time = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZone: DISPLAY_TZ }).format(d);
  return `${day} · ${time}`;
}

// Live knockout bracket "map": one column per round, winners flow toward the title.
// Connector lines are drawn from real data — a line appears the moment a match
// produces a winner — so the tree fills in after every match.
export function InteractiveBracket({ bracket }: { bracket: BracketRound[] }) {
  const UI = useUI();
  const rounds = bracket.filter((r) => r.stage !== "THIRD_PLACE");
  const thirdPlace = bracket.find((r) => r.stage === "THIRD_PLACE")?.matches[0] ?? null;

  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef(new Map<string, HTMLDivElement>());
  const colRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [paths, setPaths] = useState<{ d: string; done: boolean }[]>([]);
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const didScroll = useRef(false);

  const key = (ri: number, m: BracketMatch) => `${ri}:${m.matchNumber}`;

  // Advancing team's code: authoritative winner → else inferred from the next round
  // → else the higher score. Drives the winner highlight and the connector target.
  const advancerOf = (m: BracketMatch, next: BracketRound | undefined): string | null => {
    if (m.winnerCode) return m.winnerCode;
    if (next) {
      const codes = new Set(next.matches.flatMap((x) => [x.home?.code, x.away?.code].filter(Boolean)));
      if (m.home?.code && codes.has(m.home.code)) return m.home.code;
      if (m.away?.code && codes.has(m.away.code)) return m.away.code;
    }
    if (m.homeScore != null && m.awayScore != null && m.homeScore !== m.awayScore) {
      return (m.homeScore > m.awayScore ? m.home?.code : m.away?.code) ?? null;
    }
    return null;
  };

  // Recompute connector paths from measured card positions.
  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const recompute = () => {
      const cb = content.getBoundingClientRect();
      const pos = (k: string) => {
        const el = cardRefs.current.get(k);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { l: r.left - cb.left, r: r.right - cb.left, cy: r.top - cb.top + r.height / 2 };
      };
      const next: { d: string; done: boolean }[] = [];
      for (let ri = 0; ri < rounds.length - 1; ri++) {
        const nr = rounds[ri + 1]!;
        for (const m of rounds[ri]!.matches) {
          const adv = advancerOf(m, nr);
          if (!adv) continue;
          const target = nr.matches.find((x) => x.home?.code === adv || x.away?.code === adv);
          if (!target) continue;
          const a = pos(key(ri, m));
          const b = pos(key(ri + 1, target));
          if (!a || !b) continue;
          // Orthogonal elbow from the source's inner edge to the target's edge.
          const leftToRight = b.l > a.r; // target is to the right of source
          const sx = leftToRight ? a.r : a.l;
          const tx = leftToRight ? b.l : b.r;
          const mx = (sx + tx) / 2;
          next.push({ d: `M ${sx} ${a.cy} H ${mx} V ${b.cy} H ${tx}`, done: true });
        }
      }
      setPaths(next);
      setDims({ w: content.scrollWidth, h: content.scrollHeight });
    };
    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(content);
    window.addEventListener("resize", recompute);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", recompute);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bracket]);

  // Auto-scroll once to the round currently in play (or the first undecided one).
  useEffect(() => {
    if (didScroll.current || rounds.length === 0) return;
    let idx = rounds.findIndex((r) => r.matches.some((m) => m.live));
    if (idx < 0) idx = rounds.findIndex((r) => r.matches.some((m) => !advancerOf(m, undefined) && (m.home || m.away)));
    if (idx < 0) idx = 0;
    const col = colRefs.current[idx];
    if (col) {
      col.scrollIntoView({ inline: "center", block: "nearest" });
      didScroll.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bracket]);

  if (rounds.length === 0) return null;

  const colHeight = Math.max(...rounds.map((r) => r.matches.length)) * UNIT;

  // Champion (final decided).
  const final = rounds[rounds.length - 1];
  const finalMatch = final?.matches[0];
  const championCode = finalMatch ? advancerOf(finalMatch, undefined) : null;
  const champion: BracketTeam | null =
    championCode && finalMatch
      ? finalMatch.home?.code === championCode
        ? finalMatch.home
        : finalMatch.away?.code === championCode
          ? finalMatch.away
          : null
      : null;

  return (
    <div>
      {champion && (
        <div className="mb-4 flex items-center justify-center gap-3 rounded-2xl border border-gold-500/30 bg-gradient-to-b from-gold-500/15 to-transparent p-4">
          <span className="text-2xl">🏆</span>
          <div className="flex items-center gap-2">
            <Flag src={champion.flagUrl} className="h-7 w-7" />
            <div className="leading-tight">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gold-400">{UI.bracketChampion}</div>
              <div className="font-display text-lg font-extrabold text-white">{champion.nameAr}</div>
            </div>
          </div>
        </div>
      )}

      <p className="mb-2 text-center text-[11px] text-slate-500">{UI.bracketHint}</p>

      <div ref={scrollRef} className="no-scrollbar overflow-x-auto pb-1" dir="rtl">
        <div ref={contentRef} className="relative inline-flex gap-6 px-1">
          {/* connector layer */}
          <svg
            className="pointer-events-none absolute inset-0"
            width={dims.w || "100%"}
            height={dims.h || "100%"}
            fill="none"
          >
            {paths.map((p, i) => (
              <path
                key={i}
                className="bracket-link"
                d={p.d}
                stroke="rgba(132,204,22,0.55)"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
          </svg>

          {rounds.map((round, ri) => {
            const next = rounds[ri + 1];
            return (
              <div
                key={round.stage}
                ref={(el) => {
                  colRefs.current[ri] = el;
                }}
                className="relative z-10 flex shrink-0 flex-col justify-around"
                style={{ height: colHeight, width: 168 }}
              >
                <div className="absolute inset-x-0 -top-1 text-center text-[11px] font-bold text-gold-400">
                  {UI.stages[round.stage]}
                </div>
                {round.matches.map((m) => {
                  const adv = advancerOf(m, next);
                  return (
                    <div
                      key={m.matchNumber}
                      ref={(el) => {
                        if (el) cardRefs.current.set(key(ri, m), el);
                        else cardRefs.current.delete(key(ri, m));
                      }}
                    >
                      <BracketMatchCard m={m} advancerCode={adv} />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {thirdPlace && (
        <div className="mt-5">
          <h3 className="eyebrow mb-2">{UI.bracketThirdPlace}</h3>
          <div className="max-w-xs">
            <BracketMatchCard m={thirdPlace} advancerCode={advancerOf(thirdPlace, undefined)} />
          </div>
        </div>
      )}
    </div>
  );
}

type RowTone = "win" | "lose" | "neutral";

function BracketMatchCard({ m, advancerCode }: { m: BracketMatch; advancerCode: string | null }) {
  const UI = useUI();
  const locale = useLocale();
  const router = useRouter();
  const clickable = !!(m.home || m.away);
  // While live, treat a missing live score as 0 so the running score always shows.
  const hs = m.live ? (m.homeScore ?? 0) : m.homeScore;
  const as = m.live ? (m.awayScore ?? 0) : m.awayScore;
  const hasScore = hs != null && as != null;

  // Row emphasis: decided → the advancer is the winner; live → colour by who leads
  // (lime = winning, red = losing), like the live group standings.
  const toneFor = (side: "home" | "away"): RowTone => {
    if (advancerCode) {
      const code = side === "home" ? m.home?.code : m.away?.code;
      return code && code === advancerCode ? "win" : "neutral";
    }
    if (m.live && hs != null && as != null && hs !== as) {
      const homeLeads = hs > as;
      return side === "home" ? (homeLeads ? "win" : "lose") : homeLeads ? "lose" : "win";
    }
    return "neutral";
  };
  return (
    <div
      role={clickable ? "link" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={() => clickable && router.push(`/matches/${m.id}`)}
      onKeyDown={(e) => {
        if (clickable && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          router.push(`/matches/${m.id}`);
        }
      }}
      className={`overflow-hidden rounded-lg border bg-navy-900/80 transition ${
        m.live ? "border-lime-500/50 shadow-[0_0_14px_rgba(132,204,22,0.18)]" : "border-white/10"
      } ${clickable ? "cursor-pointer active:scale-[0.98] hover:border-white/25" : ""}`}
    >
      <BracketTeamRow team={m.home} score={hs} tone={toneFor("home")} tbd={UI.tbd} hasScore={hasScore} live={m.live} />
      <div className="h-px bg-white/10" />
      <BracketTeamRow team={m.away} score={as} tone={toneFor("away")} tbd={UI.tbd} hasScore={hasScore} live={m.live} />
      {m.live ? (
        <div className="flex items-center justify-center gap-1 bg-lime-500/10 py-0.5 text-[8px] font-bold uppercase tracking-wider text-lime-400">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-lime-400" />
          </span>
          {UI.statuses.LIVE}
        </div>
      ) : m.penaltyHome != null && m.penaltyAway != null ? (
        <div className="border-t border-white/[0.06] bg-gold-500/10 py-0.5 text-center text-[8.5px] font-bold tnum text-gold-400" dir="ltr">
          {UI.penShootout} {m.penaltyHome}-{m.penaltyAway}
        </div>
      ) : (
        <div className="border-t border-white/[0.06] bg-white/[0.02] py-0.5 text-center text-[8.5px] font-semibold tnum text-slate-500">
          {kickoffLabel(m.kickoffISO, locale)}
        </div>
      )}
    </div>
  );
}

function BracketTeamRow({
  team,
  score,
  tone,
  tbd,
  hasScore,
  live,
}: {
  team: BracketTeam | null;
  score: number | null;
  tone: RowTone;
  tbd: string;
  hasScore: boolean;
  live: boolean;
}) {
  const nameCls =
    tone === "win"
      ? "font-extrabold text-lime-300"
      : tone === "lose"
        ? "font-semibold text-red-300/90"
        : "font-semibold text-slate-200";
  const scoreCls = tone === "win" ? "text-lime-300" : tone === "lose" ? "text-red-300" : "text-slate-400";
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1.5 ${tone === "win" ? "bg-lime-500/[0.08]" : ""}`}>
      <Flag src={team?.flagUrl} className="h-4 w-4 shrink-0" />
      <span className={`min-w-0 flex-1 truncate text-[11px] ${nameCls}`}>{team?.nameAr ?? tbd}</span>
      {hasScore && (
        <span className={`flex shrink-0 items-center gap-1 font-display text-xs font-bold tnum ${scoreCls}`}>
          {live && tone === "win" && (
            <span className="relative flex h-1.5 w-1.5" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-lime-400" />
            </span>
          )}
          {score}
        </span>
      )}
    </div>
  );
}
