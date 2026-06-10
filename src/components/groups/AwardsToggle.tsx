"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUI } from "@/components/I18nProvider";
import { TrophyIcon } from "@/components/icons";

// Leader toggle for tournament-award predictions in this group.
export function AwardsToggle({ groupId, enabled }: { groupId: string; enabled: boolean }) {
  const UI = useUI();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/awards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !enabled }),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      role="switch"
      aria-checked={enabled}
      className="action-btn w-auto justify-between gap-3"
    >
      <span className="flex items-center gap-2">
        <TrophyIcon className="ab-ic" />
        {UI.awardsToggleLabel}
      </span>
      <span
        className={`relative inline-block h-5 w-9 shrink-0 rounded-full transition-colors ${
          enabled ? "bg-lime-500" : "bg-white/20"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
            enabled ? "end-0.5" : "start-0.5"
          }`}
        />
      </span>
    </button>
  );
}
