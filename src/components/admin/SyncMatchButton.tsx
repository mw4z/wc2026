"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUI } from "@/components/I18nProvider";
import { Spinner } from "@/components/Spinner";

// Admin force re-sync for a single mapped match. Pulls the provider result again
// (even if already scored) and re-runs the existing scoring path.
export function SyncMatchButton({ matchId }: { matchId: string }) {
  const UI = useUI();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function sync() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/matches/${matchId}/sync`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      setMsg(res.ok ? UI.admin.syncDone : data.error || "error");
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button onClick={sync} disabled={busy} className="btn-ghost px-3 py-1 text-xs">
        {busy ? <Spinner /> : UI.admin.syncNow}
      </button>
      {msg && <span className="text-xs text-slate-400">{msg}</span>}
    </span>
  );
}
