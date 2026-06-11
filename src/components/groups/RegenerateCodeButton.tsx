"use client";

import { Spinner } from "@/components/Spinner";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUI } from "@/components/I18nProvider";

// Leader-only: issue a fresh invite code (the old one stops working immediately).
// Lives on the main group page next to the code.
export function RegenerateCodeButton({ groupId }: { groupId: string }) {
  const UI = useUI();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function regenerate() {
    if (!confirm(UI.regenerateNote)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/regenerate`, { method: "POST" });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button onClick={regenerate} disabled={busy} className="btn-ghost text-xs">
      {busy ? <Spinner /> : UI.regenerateCode}
    </button>
  );
}
