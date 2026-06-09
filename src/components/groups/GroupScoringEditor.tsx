"use client";

import { Spinner } from "@/components/Spinner";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUI } from "@/components/I18nProvider";

interface MatchRow {
  id: string;
  label: string;
  home: string;
  away: string;
  isKnockout: boolean;
}
interface RuleRow {
  matchId: string;
  pointsExact: number | null;
  pointsOutcome: number | null;
  pointsQualifier: number | null;
}
interface Initial {
  winnerOnly: boolean;
  pointsExact: number;
  pointsOutcome: number;
  pointsQualifier: number;
  rules: RuleRow[];
}

// Empty string = "use the group default". Stored per match.
type OverrideCell = { exact: string; outcome: string; qualifier: string };

const clampStr = (s: string) => s.replace(/[^\d]/g, "").slice(0, 2);
const toNum = (s: string): number | null => (s.trim() === "" ? null : Math.min(50, Number(s)));

export function GroupScoringEditor({
  groupId,
  initial,
  matches,
}: {
  groupId: string;
  initial: Initial;
  matches: MatchRow[];
}) {
  const UI = useUI();
  const g = UI.gscore;
  const router = useRouter();

  const [winnerOnly, setWinnerOnly] = useState(initial.winnerOnly);
  const [exact, setExact] = useState(String(initial.pointsExact));
  const [outcome, setOutcome] = useState(String(initial.pointsOutcome));
  const [qualifier, setQualifier] = useState(String(initial.pointsQualifier));

  const [overrides, setOverrides] = useState<Record<string, OverrideCell>>(() => {
    const map: Record<string, OverrideCell> = {};
    for (const r of initial.rules) {
      map[r.matchId] = {
        exact: r.pointsExact?.toString() ?? "",
        outcome: r.pointsOutcome?.toString() ?? "",
        qualifier: r.pointsQualifier?.toString() ?? "",
      };
    }
    return map;
  });

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const cell = (id: string): OverrideCell => overrides[id] ?? { exact: "", outcome: "", qualifier: "" };
  const setCell = (id: string, patch: Partial<OverrideCell>) =>
    setOverrides((m) => ({ ...m, [id]: { ...cell(id), ...patch } }));
  const resetCell = (id: string) =>
    setOverrides((m) => {
      const next = { ...m };
      delete next[id];
      return next;
    });

  const customCount = matches.filter((m) => {
    const c = overrides[m.id];
    return c && (c.exact !== "" || c.outcome !== "" || c.qualifier !== "");
  }).length;

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const payload = {
        winnerOnly,
        pointsExact: Math.min(50, Number(exact) || 0),
        pointsOutcome: Math.min(50, Number(outcome) || 0),
        pointsQualifier: Math.min(50, Number(qualifier) || 0),
        overrides: matches
          .map((m) => {
            const c = cell(m.id);
            return {
              matchId: m.id,
              pointsExact: toNum(c.exact),
              pointsOutcome: toNum(c.outcome),
              pointsQualifier: toNum(c.qualifier),
            };
          })
          .filter((o) => o.pointsExact != null || o.pointsOutcome != null || o.pointsQualifier != null),
      };
      const res = await fetch(`/api/groups/${groupId}/scoring`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMsg({ ok: false, text: data.error || g.saveFailed });
        return;
      }
      setMsg({ ok: true, text: g.saved });
      router.refresh();
    } catch {
      setMsg({ ok: false, text: UI.connError });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Mode */}
      <section className="card p-5">
        <h2 className="mb-3 font-bold text-gold-400">{g.modeTitle}</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <ModeButton
            active={!winnerOnly}
            onClick={() => setWinnerOnly(false)}
            title={g.modeFull}
            desc={g.modeFullDesc}
          />
          <ModeButton
            active={winnerOnly}
            onClick={() => setWinnerOnly(true)}
            title={g.modeWinner}
            desc={g.modeWinnerDesc}
          />
        </div>
      </section>

      {/* Default point values */}
      <section className="card p-5">
        <h2 className="mb-3 font-bold text-gold-400">{g.pointsTitle}</h2>
        <div className="space-y-3">
          {!winnerOnly && (
            <PointField label={g.exactLabel} hint={g.exactHint} value={exact} onChange={setExact} />
          )}
          <PointField label={g.outcomeLabel} hint={g.outcomeHint} value={outcome} onChange={setOutcome} />
          <PointField label={g.qualifierLabel} hint={g.qualifierHint} value={qualifier} onChange={setQualifier} />
        </div>
      </section>

      {/* Per-match overrides */}
      <section className="card p-5">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-bold text-gold-400">{g.perMatchTitle}</h2>
          {customCount > 0 && (
            <span className="pill pill-scheduled text-xs">
              {customCount} {g.perMatchCount}
            </span>
          )}
        </div>
        <p className="mb-3 text-xs text-slate-500">{g.perMatchHint}</p>

        <div className="max-h-[60vh] space-y-2 overflow-y-auto pe-1">
          {matches.map((m) => {
            const c = cell(m.id);
            const customized = c.exact !== "" || c.outcome !== "" || c.qualifier !== "";
            return (
              <div
                key={m.id}
                className={`rounded-xl border p-3 transition ${
                  customized ? "border-accent-500/40 bg-accent-500/[0.06]" : "border-white/10 bg-navy-800/40"
                }`}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-slate-500">{m.label}</div>
                    <div className="truncate text-sm font-bold text-slate-200">
                      {m.home} <span className="text-slate-500">{UI.vs}</span> {m.away}
                    </div>
                  </div>
                  {customized && (
                    <button
                      type="button"
                      onClick={() => resetCell(m.id)}
                      className="shrink-0 text-xs font-semibold text-slate-400 hover:text-red-300"
                    >
                      {g.reset}
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {!winnerOnly && (
                    <MiniField
                      label={g.exactLabel}
                      placeholder={exact}
                      value={c.exact}
                      onChange={(v) => setCell(m.id, { exact: clampStr(v) })}
                    />
                  )}
                  <MiniField
                    label={g.outcomeLabel}
                    placeholder={outcome}
                    value={c.outcome}
                    onChange={(v) => setCell(m.id, { outcome: clampStr(v) })}
                  />
                  {m.isKnockout && (
                    <MiniField
                      label={g.qualifierLabel}
                      placeholder={qualifier}
                      value={c.qualifier}
                      onChange={(v) => setCell(m.id, { qualifier: clampStr(v) })}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {msg && (
        <p className={`text-center text-sm ${msg.ok ? "text-lime-400" : "text-red-300"}`}>{msg.text}</p>
      )}
      <button onClick={save} disabled={busy} className="btn-primary w-full">
        {busy ? <Spinner /> : g.saveBtn}
      </button>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-3 text-start transition ${
        active ? "border-accent-500 bg-accent-500/15" : "border-white/10 hover:border-white/25"
      }`}
    >
      <div className={`text-sm font-bold ${active ? "text-accent-300" : "text-slate-200"}`}>{title}</div>
      <div className="mt-0.5 text-xs text-slate-400">{desc}</div>
    </button>
  );
}

function PointField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-slate-200">{label}</div>
        <div className="text-xs text-slate-500">{hint}</div>
      </div>
      <input
        className="input font-display w-20 shrink-0 text-center text-lg font-bold tnum"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(clampStr(e.target.value))}
      />
    </div>
  );
}

function MiniField({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-1 items-center gap-2 rounded-lg bg-navy-900/60 px-2.5 py-1.5">
      <span className="min-w-0 truncate text-xs text-slate-400">{label}</span>
      <input
        className="font-display w-12 shrink-0 rounded-md border border-white/10 bg-navy-950 px-1 py-1 text-center text-sm font-bold tnum text-white placeholder:text-slate-600 focus:border-accent-500 focus:outline-none"
        inputMode="numeric"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
