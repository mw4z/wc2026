"use client";

import { useState } from "react";
import { useUI } from "./I18nProvider";
import { BallIcon } from "./icons";

// Profile control for per-goal push alerts: a master on/off plus a scope (all
// matches vs only matches the user predicted). Saves immediately on change.
export function GoalNotifyPrefs({
  initialEnabled,
  initialScope,
}: {
  initialEnabled: boolean;
  initialScope: "ALL" | "PREDICTED";
}) {
  const UI = useUI();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [scope, setScope] = useState<"ALL" | "PREDICTED">(initialScope);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save(next: { notifyGoals?: boolean; notifyGoalsScope?: "ALL" | "PREDICTED" }) {
    setBusy(true);
    setSaved(false);
    try {
      const res = await fetch("/api/profile/notify-prefs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (res.ok) setSaved(true);
    } finally {
      setBusy(false);
    }
  }

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    save({ notifyGoals: next });
  }
  function pick(s: "ALL" | "PREDICTED") {
    setScope(s);
    save({ notifyGoalsScope: s });
  }

  return (
    <div className="mb-5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <BallIcon className="text-lg text-lime-400" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            {UI.goalAlertsTitle}
            {saved && <span className="text-[10px] font-bold text-lime-400">{UI.goalAlertsSaved}</span>}
          </div>
          <div className="text-xs text-slate-400">{UI.goalAlertsDesc}</div>
        </div>
        {/* master on/off */}
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={toggle}
          disabled={busy}
          className={`relative h-6 w-11 shrink-0 rounded-full transition ${enabled ? "bg-lime-500" : "bg-white/15"}`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
              enabled ? "start-[22px]" : "start-0.5"
            }`}
          />
        </button>
      </div>

      {enabled && (
        <div className="mt-3 border-t border-white/[0.06] pt-3">
          <div className="mb-2 text-xs font-semibold text-slate-400">{UI.goalAlertsScopeLabel}</div>
          <div className="flex gap-2">
            {(["ALL", "PREDICTED"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => pick(s)}
                disabled={busy}
                className={`flex-1 rounded-lg border px-2 py-2 text-xs font-semibold transition ${
                  scope === s
                    ? "border-lime-500 bg-lime-500/15 text-lime-300"
                    : "border-white/10 text-slate-300 hover:border-white/25"
                }`}
              >
                {s === "ALL" ? UI.goalAlertsAll : UI.goalAlertsPredicted}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
