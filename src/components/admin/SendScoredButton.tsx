"use client";

import { Spinner } from "@/components/Spinner";

import { useState } from "react";
import { useUI } from "@/components/I18nProvider";

// Admin: (re)send the "scored" push for a finished match. Deduped server-side,
// so clicking it twice never double-notifies anyone.
export function SendScoredButton({ matchId }: { matchId: string }) {
  const UI = useUI();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function send() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/matches/${matchId}/notify-scored`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data.error || UI.actionFailed);
        return;
      }
      const n = data.sent ?? 0;
      setMsg(n > 0 ? UI.admin.notifyScoredDone.replace("{n}", String(n)) : UI.admin.notifyScoredNone);
    } catch {
      setMsg(UI.connError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <button onClick={send} disabled={busy} className="btn-ghost text-xs">
        {busy ? <Spinner /> : UI.admin.notifyScored}
      </button>
      {msg && <span className="text-xs text-slate-400">{msg}</span>}
    </div>
  );
}
