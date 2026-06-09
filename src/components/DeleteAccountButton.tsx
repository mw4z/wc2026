"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUI } from "./I18nProvider";

// Self-service account deletion (profile danger zone). Confirms, deletes via the
// account API (which clears the session server-side), then sends to /login.
export function DeleteAccountButton() {
  const UI = useUI();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!confirm(UI.deleteAccountConfirm)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (res.ok) {
        router.push("/login");
        router.refresh();
      } else {
        alert((await res.json().catch(() => ({}))).error || UI.deleteAccountFailed);
      }
    } catch {
      alert(UI.deleteAccountFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card mt-6 border-danger/30 p-5">
      <h2 className="text-sm font-bold text-red-300">{UI.dangerZone}</h2>
      <p className="mt-1 text-xs text-slate-400">{UI.deleteAccountWarning}</p>
      <button
        onClick={remove}
        disabled={busy}
        className="btn mt-3 border border-danger/50 text-red-300 hover:bg-danger/10"
      >
        {busy ? "..." : UI.deleteAccount}
      </button>
    </div>
  );
}
