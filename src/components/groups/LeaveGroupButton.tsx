"use client";

import { Spinner } from "@/components/Spinner";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUI } from "@/components/I18nProvider";
import { LogoutIcon } from "@/components/icons";

// Leave-group action for the group dashboard. Confirms first (leaders get a
// stronger warning about leadership transfer / disband), then POSTs /leave and
// returns to the groups list.
export function LeaveGroupButton({ groupId, isLeader }: { groupId: string; isLeader: boolean }) {
  const UI = useUI();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function leave() {
    if (!confirm(isLeader ? UI.leaderLeaveConfirm : UI.leaveGroupConfirm)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/groups/${groupId}/leave`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || UI.actionFailed);
        return;
      }
      router.push("/groups");
      router.refresh();
    } catch {
      setError(UI.connError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 text-center">
      <button
        onClick={leave}
        disabled={busy}
        className="btn inline-flex items-center gap-1.5 border border-danger/40 text-sm text-red-300 hover:bg-danger/10"
      >
        {busy ? <Spinner /> : <LogoutIcon className="text-base rtl:-scale-x-100" />}
        {UI.leaveGroup}
      </button>
      {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
    </div>
  );
}
