"use client";

import { useEffect, useRef, useState } from "react";
import { useUI } from "@/components/I18nProvider";
import { RankMedallion } from "@/components/RankMedallion";

export interface LbRow {
  userId: string;
  name: string;
  department: string | null;
  totalPoints: number;
  exactScores: number;
  correctOutcomes: number;
  correctQualifiers: number;
  accuracy: number;
  rank: number;
  // Rank change after the last scored match: >0 climbed, <0 dropped, 0/null none.
  movement?: number | null;
}

// Green ▲ / red ▼ with the number of places moved since the last scored match.
// Nothing renders when the rank is unchanged or there's no prior standing yet.
export function MovementIndicator({ movement }: { movement?: number | null }) {
  if (movement == null || movement === 0) return null;
  const up = movement > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-bold tnum leading-none ${
        up ? "text-lime-400" : "text-red-400"
      }`}
      aria-label={up ? `up ${movement}` : `down ${-movement}`}
      title={up ? `▲ ${movement}` : `▼ ${-movement}`}
    >
      <span aria-hidden>{up ? "▲" : "▼"}</span>
      {Math.abs(movement)}
    </span>
  );
}

// Leaderboard table where every row is tappable → opens a record sheet for that
// user. Uses only the public stats already in each row (no private data).
export function LeaderboardTable({
  rows,
  myPinned,
  meId,
  showCapNote,
}: {
  rows: LbRow[];
  myPinned: LbRow | null;
  meId: string;
  showCapNote: boolean;
}) {
  const UI = useUI();
  const [sel, setSel] = useState<LbRow | null>(null);

  const Cells = ({ r, pinned }: { r: LbRow; pinned?: boolean }) => (
    <>
      <td className="p-3">
        <div className="flex items-center gap-1.5">
          {!pinned && r.rank <= 3 ? (
            <RankMedallion place={r.rank} size="sm" />
          ) : (
            <span className={`font-display font-bold tnum ${pinned ? "text-accent-300" : "text-slate-300"}`}>{r.rank}</span>
          )}
          <MovementIndicator movement={r.movement} />
        </div>
      </td>
      <td className="p-3 font-semibold text-white">
        {r.name}
        {pinned && <span className="ms-1 text-[10px] text-accent-300">({UI.yourPosition})</span>}
      </td>
      <td className="hidden p-3 text-slate-400 sm:table-cell">{r.department ?? "—"}</td>
      <td className="p-3 font-display font-extrabold tnum text-gold-400">{r.totalPoints}</td>
      <td className="hidden p-3 tnum md:table-cell">{r.exactScores}</td>
      <td className="hidden p-3 tnum md:table-cell">{r.correctOutcomes}</td>
      <td className="hidden p-3 tnum lg:table-cell">{r.correctQualifiers}</td>
      <td className="hidden p-3 tnum lg:table-cell">{(r.accuracy * 100).toFixed(0)}%</td>
    </>
  );

  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-right text-sm">
        <thead className="border-b border-white/10 text-[11px] text-slate-400">
          <tr>
            <th className="p-3 font-bold">{UI.rank}</th>
            <th className="p-3 font-bold">{UI.name}</th>
            <th className="hidden p-3 font-bold sm:table-cell">{UI.department}</th>
            <th className="p-3 font-bold">{UI.colPoints}</th>
            <th className="hidden p-3 font-bold md:table-cell">{UI.colExact}</th>
            <th className="hidden p-3 font-bold md:table-cell">{UI.colCorrect}</th>
            <th className="hidden p-3 font-bold lg:table-cell">{UI.colQualifier}</th>
            <th className="hidden p-3 font-bold lg:table-cell">{UI.colAccuracy}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.userId}
              onClick={() => setSel(r)}
              className={`cursor-pointer border-b border-white/5 transition active:bg-white/10 ${
                r.userId === meId ? "bg-accent-500/10 ring-1 ring-inset ring-accent-500/40" : ""
              }`}
            >
              <Cells r={r} />
            </tr>
          ))}
          {myPinned && (
            <tr onClick={() => setSel(myPinned)} className="cursor-pointer border-t-2 border-accent-500/40 bg-accent-500/10">
              <Cells r={myPinned} pinned />
            </tr>
          )}
        </tbody>
      </table>
      {showCapNote && (
        <p className="border-t border-white/5 p-3 text-center text-xs text-slate-500">{UI.topCapNote}</p>
      )}

      {sel && <RecordSheet row={sel} isMe={sel.userId === meId} onClose={() => setSel(null)} />}
    </div>
  );
}

function RecordSheet({ row, isMe, onClose }: { row: LbRow; isMe: boolean; onClose: () => void }) {
  const UI = useUI();
  const [dragY, setDragY] = useState(0);
  const startY = useRef<number | null>(null);

  // Lock the background scroll while the sheet is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  function onTouchStart(e: React.TouchEvent) {
    startY.current = e.touches[0]!.clientY;
  }
  function onTouchMove(e: React.TouchEvent) {
    if (startY.current == null) return;
    const dy = e.touches[0]!.clientY - startY.current;
    if (dy > 0) setDragY(dy); // only drag downward
  }
  function onTouchEnd() {
    if (dragY > 90) onClose();
    else setDragY(0);
    startY.current = null;
  }

  const stat = (label: string, value: string | number) => (
    <div className="rounded-xl bg-white/[0.04] p-3 text-center">
      <div className="font-display text-2xl font-extrabold tnum text-gold-400">{value}</div>
      <div className="mt-0.5 text-[11px] text-slate-400">{label}</div>
    </div>
  );
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="w-full max-w-md touch-none rounded-t-2xl border-t border-white/10 bg-navy-950 p-5 pb-8 sm:rounded-2xl sm:border"
        style={{ transform: dragY ? `translateY(${dragY}px)` : undefined, transition: dragY ? "none" : "transform 0.2s" }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20 sm:hidden" />
        <div className="mb-4 flex items-center gap-3">
          <RankMedallion place={row.rank} size="lg" />
          <div className="min-w-0">
            <div className="truncate text-lg font-extrabold text-white">{row.name}{isMe && <span className="ms-1 text-xs text-accent-300">({UI.yourPosition})</span>}</div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span>{UI.overallRank}: #{row.rank}{row.department ? ` · ${row.department}` : ""}</span>
              <MovementIndicator movement={row.movement} />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {stat(UI.totalPoints, row.totalPoints)}
          {stat(UI.colExact, row.exactScores)}
          {stat(UI.colCorrect, row.correctOutcomes)}
          {stat(UI.colQualifier, row.correctQualifiers)}
          {stat(UI.colAccuracy, `${(row.accuracy * 100).toFixed(0)}%`)}
        </div>
        <button onClick={onClose} className="btn-primary mt-5 w-full">{UI.installClose}</button>
      </div>
    </div>
  );
}
