"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUI } from "@/components/I18nProvider";
import { Spinner } from "@/components/Spinner";

interface MapReport {
  applied: boolean;
  mapped: { label: string }[];
  ambiguous: { label: string; note: string }[];
  unmapped: { label: string; note: string }[];
}

// Admin tool: maps our matches to provider fixture ids server-side. Preview first
// (dry run), then apply. Lists ambiguous/unmapped so the admin can act on them.
export function MapFixturesButton() {
  const UI = useUI();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<MapReport | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function run(apply: boolean) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/matches/map-fixtures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apply }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || "error");
        return;
      }
      setReport(data);
      if (apply) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card mb-6 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">{UI.admin.mapFixtures}</span>
        <button onClick={() => run(false)} disabled={busy} className="btn-ghost px-3 py-1.5 text-sm">
          {busy ? <Spinner /> : UI.admin.mapPreview}
        </button>
        <button onClick={() => run(true)} disabled={busy || !report} className="btn-gold px-3 py-1.5 text-sm">
          {UI.admin.mapApply}
        </button>
      </div>

      {err && <p className="mt-2 text-sm text-red-300">{err}</p>}

      {report && (
        <div className="mt-3 space-y-2 text-sm">
          <div className="flex flex-wrap gap-3">
            <span className="text-lime-400">{report.mapped.length} {UI.admin.mapMapped}</span>
            <span className="text-amber-300">{report.ambiguous.length} {UI.admin.mapAmbiguous}</span>
            <span className="text-slate-400">{report.unmapped.length} {UI.admin.mapUnmapped}</span>
            {report.applied && <span className="badge bg-lime-500/20 text-lime-300">✓</span>}
          </div>
          {report.ambiguous.length > 0 && (
            <ul className="list-disc ps-5 text-xs text-amber-300/90">
              {report.ambiguous.map((x, i) => <li key={i}>{x.label} — {x.note}</li>)}
            </ul>
          )}
          {report.unmapped.length > 0 && (
            <ul className="list-disc ps-5 text-xs text-slate-400">
              {report.unmapped.map((x, i) => <li key={i}>{x.label} — {x.note}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
