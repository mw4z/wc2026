"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminControls({ registrationOpen }: { registrationOpen: boolean }) {
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
  const [note, setNote] = useState<string | null>(null);

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
      else setNote(data.error || "فشل الاستيراد");
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
      setNote(res.ok ? `تم تحديث الترتيب (${data.entries} مشارك)` : data.error);
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
        setNote(next ? "تم فتح تسجيل المشاركين" : "تم إغلاق تسجيل المشاركين الجدد");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="card p-5">
        <h2 className="mb-3 font-bold text-gold-400">استيراد المباريات (CSV)</h2>
        <p className="mb-2 text-xs text-slate-400">
          الأعمدة: match_number, stage, home_team_code, away_team_code, kickoff_at, city, stadium —
          الوقت بصيغة ISO وبتوقيت UTC.
        </p>
        <textarea
          dir="ltr"
          className="input h-40 font-mono text-xs"
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          placeholder="match_number,stage,home_team_code,..."
        />
        <button onClick={importCsv} disabled={busy || !csv.trim()} className="btn-gold mt-3">
          استيراد
        </button>
        {summary && (
          <div className="mt-3 rounded-lg bg-navy-800 p-3 text-sm">
            <p>
              تم الإنشاء: <b>{summary.created}</b> · التحديث: <b>{summary.updated}</b> · المتجاهَل:{" "}
              <b>{summary.skipped}</b>
            </p>
            {summary.errors.length > 0 && (
              <ul className="mt-2 list-disc pr-5 text-xs text-red-300">
                {summary.errors.map((e, i) => (
                  <li key={i}>صف {e.row}: {e.message}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <section className="card flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <h2 className="font-bold text-gold-400">إعادة احتساب الترتيب</h2>
          <p className="text-xs text-slate-400">يعيد بناء لوحة المتصدرين من جميع النقاط المحتسبة.</p>
        </div>
        <button onClick={recalc} disabled={busy} className="btn-ghost">
          إعادة الاحتساب الكامل
        </button>
      </section>

      <section className="card flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <h2 className="font-bold text-gold-400">تسجيل المشاركين الجدد</h2>
          <p className="text-xs text-slate-400">
            الحالة: {regOpen ? "مفتوح" : "مغلق"} — أغلقه بعد انطلاق البطولة لمنع حسابات جديدة.
          </p>
        </div>
        <button onClick={toggleReg} disabled={busy} className="btn-ghost">
          {regOpen ? "إغلاق التسجيل" : "فتح التسجيل"}
        </button>
      </section>

      {note && <p className="text-center text-sm text-gold-300">{note}</p>}
    </div>
  );
}
