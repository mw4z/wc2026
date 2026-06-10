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
    <button onClick={toggle} disabled={busy} className="action-btn w-auto">
      <TrophyIcon className="ab-ic" />
      {enabled ? UI.awardsDisableLeader : UI.awardsEnableLeader}
    </button>
  );
}
