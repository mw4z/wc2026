"use client";

import { useState } from "react";
import { useUI } from "@/components/I18nProvider";
import { BellIcon } from "@/components/icons";

// Admin tool: fire a push to the admin's own subscribed devices right now.
export function PushTestButton() {
  const UI = useUI();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function send() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMsg({ ok: true, text: `${UI.admin.testPushSent} (${data.sent}/${data.total})` });
      } else {
        setMsg({ ok: false, text: data.error || UI.admin.testPushFailed });
      }
    } catch {
      setMsg({ ok: false, text: UI.admin.testPushFailed });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card flex flex-wrap items-center justify-between gap-3 p-5">
      <div className="min-w-0">
        <h2 className="font-bold text-gold-400">{UI.admin.testPushTitleCard}</h2>
        <p className="text-xs text-slate-400">{UI.admin.testPushHint}</p>
        {msg && (
          <p className={`mt-1 text-sm ${msg.ok ? "text-ok" : "text-red-300"}`}>{msg.text}</p>
        )}
      </div>
      <button onClick={send} disabled={busy} className="btn-ghost">
        <BellIcon className="text-base" />
        {busy ? "..." : UI.admin.testPush}
      </button>
    </section>
  );
}
