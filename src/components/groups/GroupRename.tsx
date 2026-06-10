"use client";

import { Spinner } from "@/components/Spinner";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUI } from "@/components/I18nProvider";

// Leader-only inline rename, shown on the main group page next to the name.
// Pre-fills the current name; saves via the group PATCH endpoint.
export function GroupRename({ groupId, currentName }: { groupId: string; currentName: string }) {
  const UI = useUI();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(currentName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || UI.saveFailed);
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError(UI.connError);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => {
          setName(currentName);
          setOpen(true);
        }}
        className="btn-ghost text-sm"
      >
        {UI.renameGroup}
      </button>
    );
  }

  return (
    <div className="card mb-4 p-4">
      <label className="label">{UI.groupName}</label>
      <div className="flex gap-2">
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          autoFocus
        />
        <button onClick={save} disabled={busy || name.trim().length < 2} className="btn-gold text-sm">
          {busy ? <Spinner /> : UI.save}
        </button>
        <button onClick={() => setOpen(false)} className="btn-ghost text-sm">
          {UI.cancel}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
    </div>
  );
}
