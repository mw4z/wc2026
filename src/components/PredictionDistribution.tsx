import { UI } from "@/lib/constants";

type Stats = {
  total: number;
  homeWinPct: number;
  drawPct: number;
  awayWinPct: number;
};

type Outcome = "HOME" | "DRAW" | "AWAY";

/**
 * Post-lock aggregate view of how everyone predicted this match's outcome.
 * Presentational only — figures come from getPredictionStatsAfterLock, which
 * refuses to return anything until the match has locked (no pre-lock leakage).
 * `actual` highlights the outcome that really happened once a result is in.
 */
export function PredictionDistribution({
  stats,
  homeName,
  awayName,
  actual,
}: {
  stats: Stats;
  homeName: string;
  awayName: string;
  actual?: Outcome | null;
}) {
  const rows: { key: Outcome; label: string; pct: number }[] = [
    { key: "HOME", label: `${UI.outcomeHomeWin} (${homeName})`, pct: stats.homeWinPct },
    { key: "DRAW", label: UI.outcomeDraw, pct: stats.drawPct },
    { key: "AWAY", label: `${UI.outcomeAwayWin} (${awayName})`, pct: stats.awayWinPct },
  ];

  return (
    <section className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-bold text-gold-400">{UI.predictionDistribution}</h2>
        <span className="text-xs text-slate-400">
          {UI.predictionsCount}: <b className="text-slate-200">{stats.total}</b>
        </span>
      </div>

      {stats.total === 0 ? (
        <p className="py-4 text-center text-sm text-slate-500">{UI.noPredictionsYet}</p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const hit = actual != null && actual === r.key;
            return (
              <div key={r.key}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className={hit ? "font-bold text-gold-300" : "text-slate-300"}>
                    {r.label}
                    {hit && " ✔"}
                  </span>
                  <span className="font-mono font-bold tabular-nums text-slate-200">{r.pct}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-navy-700">
                  <div
                    className={`h-full rounded-full ${hit ? "bg-gold-400" : "bg-gold-500/50"}`}
                    style={{ width: `${r.pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
