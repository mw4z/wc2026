"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminGroupToggle({ groupId, isActive }: { groupId: string; isActive: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/groups/${groupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (res.ok) router.refresh();
      else alert((await res.json()).error || "تعذّر التنفيذ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button onClick={toggle} disabled={busy} className="btn-ghost text-sm">
      {isActive ? "تعطيل المجموعة" : "تفعيل المجموعة"}
    </button>
  );
}
