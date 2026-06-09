"use client";

import { useState } from "react";
import { useUI } from "../I18nProvider";

export function CopyCode({ code }: { code: string }) {
  const UI = useUI();
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  async function copy(kind: "code" | "link") {
    const text = kind === "link" ? `${window.location.origin}/join/${code}` : code;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="rounded-lg border border-gold-500/40 bg-gold-500/10 px-3 py-1.5 font-mono text-lg font-bold tracking-widest text-gold-300">
        {code}
      </span>
      <button onClick={() => copy("code")} className="btn-ghost px-3 py-1.5 text-sm">
        {copied === "code" ? UI.codeCopied : UI.copyCode}
      </button>
      <button onClick={() => copy("link")} className="btn-ghost px-3 py-1.5 text-sm">
        {copied === "link" ? UI.inviteCopied : UI.copyInviteLink}
      </button>
      <button onClick={whatsappInvite} className="btn-ghost px-3 py-1.5 text-sm">
        {UI.inviteViaWhatsApp}
      </button>
    </div>
  );

  function whatsappInvite() {
    const msg = `انضم لمجموعة توقعات كأس 2026 ⚽\nكود المجموعة: ${code}\nرابط الانضمام:\n${window.location.origin}/join/${code}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
  }
}
