"use client";

import { useEffect, useRef, useState } from "react";
import { useUI } from "./I18nProvider";
import { Flag } from "./Flag";
import type { MatchCenter as MatchCenterData, TeamLineup, LineupPlayer, MatchEvent, Side } from "@/lib/matchCenter";

const POLL_MS = 20_000;

export function MatchCenter({
  matchId,
  initial,
  homeName,
  awayName,
  homeFlag,
  awayFlag,
}: {
  matchId: string;
  initial: MatchCenterData;
  homeName: string;
  awayName: string;
  homeFlag: string | null;
  awayFlag: string | null;
}) {
  const UI = useUI();
  const [data, setData] = useState(initial);
  const [tab, setTab] = useState<"pitch" | "events">("pitch");
  const active = useRef(true);

  useEffect(() => {
    active.current = true;
    const tick = async () => {
      try {
        const res = await fetch(`/api/matches/${matchId}/center`, { cache: "no-store" });
        if (!res.ok || !active.current) return;
        const next = (await res.json()) as MatchCenterData;
        if (active.current) setData(next);
      } catch {
        /* keep last data */
      }
    };
    // Poll while the match isn't final; one more fetch after final settles events.
    const iv = setInterval(() => {
      if (data.state === "post") return;
      tick();
    }, POLL_MS);
    return () => {
      active.current = false;
      clearInterval(iv);
    };
  }, [matchId, data.state]);

  if (!data.available) {
    return (
      <div className="card p-5 text-center text-sm text-slate-500">{UI.mcSoon}</div>
    );
  }

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-2">
        {(["pitch", "events"] as const).map((t) => (
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
            {t === "pitch" ? UI.mcLineups : UI.mcEvents}
          </button>
        ))}
      </div>

      {tab === "pitch" ? (
        <>
          <Pitch
            home={data.home}
            away={data.away}
            homeName={homeName}
            awayName={awayName}
            homeFlag={homeFlag}
            awayFlag={awayFlag}
          />
          <Benches home={data.home} away={data.away} homeName={homeName} awayName={awayName} />
        </>
      ) : (
        <EventsFeed events={data.events} homeName={homeName} awayName={awayName} />
      )}
    </div>
  );
}

// ---- Pitch ----
function Pitch({
  home,
  away,
  homeName,
  awayName,
  homeFlag,
  awayFlag,
}: {
  home: TeamLineup | null;
  away: TeamLineup | null;
  homeName: string;
  awayName: string;
  homeFlag: string | null;
  awayFlag: string | null;
}) {
  return (
    <div className="card overflow-hidden p-0">
      <div className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
        <span className="flex items-center gap-1.5 font-semibold text-slate-200">
          <Flag src={awayFlag} className="h-4 w-4" /> {awayName}
          {away?.formation && <span className="text-slate-500">· {away.formation}</span>}
        </span>
        <span className="flex items-center gap-1.5 font-semibold text-slate-200">
          {home?.formation && <span className="text-slate-500">{home.formation} ·</span>}
          {homeName} <Flag src={homeFlag} className="h-4 w-4" />
        </span>
      </div>
      <div
        className="relative w-full"
        style={{
          aspectRatio: "3 / 4",
          background:
            "repeating-linear-gradient(0deg, #0c5a32 0px, #0c5a32 40px, #0a532e 40px, #0a532e 80px)",
        }}
      >
        <PitchLines />
        {away?.starters.map((p) => (
          <PlayerToken key={`a-${p.id}-${p.jersey}`} p={p} side="away" />
        ))}
        {home?.starters.map((p) => (
          <PlayerToken key={`h-${p.id}-${p.jersey}`} p={p} side="home" />
        ))}
      </div>
    </div>
  );
}

function PitchLines() {
  return (
    <div className="pointer-events-none absolute inset-0 opacity-60">
      <div className="absolute inset-2 rounded-sm border border-white/25" />
      <div className="absolute left-2 right-2 top-1/2 h-px -translate-y-1/2 bg-white/25" />
      <div className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/25" />
      {/* penalty boxes */}
      <div className="absolute left-1/2 top-2 h-12 w-28 -translate-x-1/2 border border-white/25" />
      <div className="absolute bottom-2 left-1/2 h-12 w-28 -translate-x-1/2 border border-white/25" />
    </div>
  );
}

function ratingTone(r: number): string {
  if (r >= 8) return "bg-lime-500 text-navy-950";
  if (r >= 7) return "bg-emerald-500 text-navy-950";
  if (r >= 6) return "bg-amber-500 text-navy-950";
  return "bg-red-500 text-white";
}

function PlayerToken({ p, side }: { p: LineupPlayer; side: Side }) {
  return (
    <div
      className="absolute flex w-16 -translate-x-1/2 -translate-y-1/2 flex-col items-center"
      style={{ left: `${p.x}%`, top: `${p.y}%` }}
    >
      <div className="relative">
        <div className="h-9 w-9 overflow-hidden rounded-full bg-navy-800 ring-2 ring-white/70">
          {p.headshot ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.headshot} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-[11px] font-extrabold text-slate-200">
              {p.jersey}
            </div>
          )}
        </div>
        {/* jersey number chip */}
        <span className="absolute -bottom-1 -start-1 grid h-4 min-w-4 place-items-center rounded-full bg-navy-950 px-0.5 text-[8px] font-extrabold tnum text-white ring-1 ring-white/40">
          {p.jersey}
        </span>
        {/* rating */}
        {p.rating != null && (
          <span className={`absolute -end-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded px-0.5 text-[8px] font-extrabold tnum ${ratingTone(p.rating)}`}>
            {p.rating.toFixed(1)}
          </span>
        )}
        {/* status marks */}
        <span className="absolute -bottom-1 -end-1 flex items-center gap-0.5">
          {p.goals > 0 && <span className="text-[10px] leading-none">⚽</span>}
          {p.red ? (
            <span className="h-2.5 w-1.5 rounded-[1px] bg-red-500" aria-label="red card" />
          ) : p.yellow ? (
            <span className="h-2.5 w-1.5 rounded-[1px] bg-yellow-400" aria-label="yellow card" />
          ) : null}
          {p.subbedOut && <span className="text-[9px] leading-none text-red-400">▾</span>}
        </span>
      </div>
      <span className="mt-1 max-w-full truncate rounded bg-navy-950/70 px-1 text-[9px] font-semibold text-white">
        {p.name}
      </span>
    </div>
  );
}

// ---- Benches ----
function Benches({
  home,
  away,
  homeName,
  awayName,
}: {
  home: TeamLineup | null;
  away: TeamLineup | null;
  homeName: string;
  awayName: string;
}) {
  const UI = useUI();
  const hasBench = (home?.bench.length ?? 0) > 0 || (away?.bench.length ?? 0) > 0;
  if (!hasBench) return null;
  return (
    <div className="mt-4">
      <h3 className="eyebrow mb-2">{UI.mcBench}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <BenchList title={homeName} players={home?.bench ?? []} />
        <BenchList title={awayName} players={away?.bench ?? []} />
      </div>
    </div>
  );
}

function BenchList({ title, players }: { title: string; players: LineupPlayer[] }) {
  if (players.length === 0) return null;
  return (
    <div className="card p-3">
      <div className="mb-2 text-xs font-bold text-gold-400">{title}</div>
      <ul className="space-y-1.5">
        {players.map((p) => (
          <li key={`${p.id}-${p.jersey}`} className="flex items-center gap-2 text-xs">
            <span className="w-5 shrink-0 text-center font-bold tnum text-slate-500">{p.jersey}</span>
            <span className="min-w-0 flex-1 truncate text-slate-200">{p.name}</span>
            {p.subbedIn && <span className="text-[9px] leading-none text-lime-400">▴</span>}
            {p.goals > 0 && <span className="text-[10px]">⚽</span>}
            {p.red ? (
              <span className="h-2.5 w-1.5 rounded-[1px] bg-red-500" />
            ) : p.yellow ? (
              <span className="h-2.5 w-1.5 rounded-[1px] bg-yellow-400" />
            ) : null}
            {p.rating != null && (
              <span className={`grid h-4 min-w-4 place-items-center rounded px-0.5 text-[9px] font-extrabold tnum ${ratingTone(p.rating)}`}>
                {p.rating.toFixed(1)}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---- Events feed ----
function eventIcon(type: MatchEvent["type"]) {
  switch (type) {
    case "goal":
    case "penalty-goal":
      return <span className="text-base leading-none">⚽</span>;
    case "own-goal":
      return <span className="text-base leading-none" title="own goal">⚽</span>;
    case "penalty-missed":
      return <span className="text-sm leading-none">❌</span>;
    case "yellow":
      return <span className="inline-block h-3.5 w-2.5 rounded-[1px] bg-yellow-400" />;
    case "red":
      return <span className="inline-block h-3.5 w-2.5 rounded-[1px] bg-red-500" />;
    case "second-yellow":
      return (
        <span className="inline-flex">
          <span className="inline-block h-3.5 w-2.5 rounded-[1px] bg-yellow-400" />
          <span className="-ms-1 inline-block h-3.5 w-2.5 rounded-[1px] bg-red-500" />
        </span>
      );
    case "sub":
      return <span className="text-sm leading-none text-accent-300">⇄</span>;
    case "var":
      return <span className="rounded bg-white/10 px-1 text-[9px] font-bold text-slate-200">VAR</span>;
    default:
      return <span className="text-slate-500">•</span>;
  }
}

function EventsFeed({ events, homeName, awayName }: { events: MatchEvent[]; homeName: string; awayName: string }) {
  const UI = useUI();
  if (events.length === 0) {
    return <div className="card p-5 text-center text-sm text-slate-500">{UI.mcNoEvents}</div>;
  }
  return (
    <div className="card divide-y divide-white/[0.06] overflow-hidden">
      {events.map((e, i) => {
        const teamName = e.side === "home" ? homeName : e.side === "away" ? awayName : "";
        const label = UI.mcEventTypes[e.type] ?? e.text;
        return (
          <div key={i} className="flex items-center gap-3 px-3 py-2 text-sm">
            <span className="w-9 shrink-0 text-center font-display font-bold tnum text-slate-400">{e.minute}</span>
            <span className="grid w-6 shrink-0 place-items-center">{eventIcon(e.type)}</span>
            <span className="min-w-0 flex-1">
              {e.player && <span className="font-semibold text-slate-100">{e.player}</span>}
              <span className="ms-1.5 text-xs text-slate-400">
                {label}
                {teamName && ` · ${teamName}`}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
