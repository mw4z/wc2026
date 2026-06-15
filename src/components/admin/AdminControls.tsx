"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUI } from "@/components/I18nProvider";

export function AdminControls({
  registrationOpen,
  predictionLead,
}: {
  registrationOpen: boolean;
  predictionLead: string;
}) {
  const UI = useUI();
  const router = useRouter();
  const [csv, setCsv] = useState("");
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<null | {
    created: number;
    updated: number;
    skipped: number;
    errors: { row: number; message: string }[];
  }>(null);
  const [regOpen, setRegOpen] = useState(registrationOpen);
  const [lead, setLead] = useState(predictionLead);
  const [note, setNote] = useState<string | null>(null);

  const LEAD_OPTS = [
    { v: "always", label: UI.admin.predWindowAlways },
    { v: "24", label: UI.admin.predWindow24 },
    { v: "12", label: UI.admin.predWindow12 },
    { v: "6", label: UI.admin.predWindow6 },
    { v: "2", label: UI.admin.predWindow2 },
  ];

  async function changeLead(value: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ predictionLead: value }),
      });
      if (res.ok) {
        setLead(value);
        setNote(UI.admin.predWindowSaved);
      }
    } finally {
      setBusy(false);
    }
  }

  async function importCsv() {
    setBusy(true);
    setSummary(null);
    try {
      const res = await fetch("/api/admin/import", {
        method: "POST",
        headers: { "Content-Type": "text/csv" },
        body: csv,
      });
      const data = await res.json();
      if (res.ok) setSummary(data.summary);
      else setNote(data.error || UI.admin.importFailed);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function recalc() {
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch("/api/admin/recalculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = await res.json();
      // Surface the rank-arrow backfill result so it's obvious whether the last
      // match moved anyone (or why nothing showed up).
      const movement = res.ok
        ? data.movementError
          ? ` · ⚠︎ ${data.movementError}`
          : data.movementFrom == null
            ? " · no scored match yet"
            : ` · ${data.moved ?? 0} ▲▼`
        : "";
      const goals =
        res.ok && data.goalsBackfill?.goals ? ` · ⚽ ${data.goalsBackfill.goals} (${data.goalsBackfill.matches})` : "";
      const fixed = res.ok && data.goalsBackfill?.corrected ? ` · 🛠 ${data.goalsBackfill.corrected}` : "";
      setNote(res.ok ? `${UI.admin.recalcDonePrefix} (${data.entries} ${UI.admin.participantsWord})${movement}${goals}${fixed}` : data.error);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function toggleReg() {
    const next = !regOpen;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationOpen: next }),
      });
      if (res.ok) {
        setRegOpen(next);
        setNote(next ? UI.admin.regOpened : UI.admin.regClosed);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="card p-5">
        <h2 className="mb-3 font-bold text-gold-400">{UI.admin.importTitle}</h2>
        <p className="mb-2 text-xs text-slate-400">{UI.admin.importColumns}</p>
        <textarea
          dir="ltr"
          className="input h-40 font-mono text-xs"
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          placeholder="match_number,stage,home_team_code,..."
        />
        <button onClick={importCsv} disabled={busy || !csv.trim()} className="btn-gold mt-3">
          {UI.admin.importBtn}
        </button>
        {summary && (
          <div className="mt-3 rounded-lg bg-navy-800 p-3 text-sm">
            <p>
              {UI.admin.created}: <b>{summary.created}</b> · {UI.admin.updated}: <b>{summary.updated}</b> ·{" "}
              {UI.admin.skipped}: <b>{summary.skipped}</b>
            </p>
            {summary.errors.length > 0 && (
              <ul className="mt-2 list-disc ps-5 text-xs text-red-300">
                {summary.errors.map((e, i) => (
                  <li key={i}>{UI.admin.row} {e.row}: {e.message}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <section className="card flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <h2 className="font-bold text-gold-400">{UI.admin.recalcTitle}</h2>
          <p className="text-xs text-slate-400">{UI.admin.recalcNote}</p>
        </div>
        <button onClick={recalc} disabled={busy} className="btn-ghost">
          {UI.admin.recalcBtn}
        </button>
      </section>

      <section className="card flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <h2 className="font-bold text-gold-400">{UI.admin.regTitle}</h2>
          <p className="text-xs text-slate-400">
            {UI.admin.status}: {regOpen ? UI.admin.regOpenState : UI.admin.regClosedState} — {UI.admin.regNote}
          </p>
        </div>
        <button onClick={toggleReg} disabled={busy} className="btn-ghost">
          {regOpen ? UI.admin.regClose : UI.admin.regOpenBtn}
        </button>
      </section>

      <section className="card flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <h2 className="font-bold text-gold-400">{UI.admin.predWindowTitle}</h2>
          <p className="text-xs text-slate-400">{UI.admin.predWindowNote}</p>
        </div>
        <select
          value={lead}
          onChange={(e) => changeLead(e.target.value)}
          disabled={busy}
          className="input w-auto"
        >
          {LEAD_OPTS.map((o) => (
            <option key={o.v} value={o.v}>
              {o.label}
            </option>
          ))}
        </select>
      </section>

      {note && <p className="text-center text-sm text-gold-300">{note}</p>}
    </div>
  );
}
