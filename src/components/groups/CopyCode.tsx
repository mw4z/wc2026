"use client";

import { useState } from "react";
import { useUI } from "../I18nProvider";
import { CopyIcon, LinkIcon, WhatsAppIcon } from "../icons";

// Renders the three invite actions as uniform grid-item buttons (the parent
// supplies the grid). The group code chip itself is shown by the page header.
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

  function whatsappInvite() {
    const msg = `انضم لمجموعة توقعات كأس 2026 ⚽\nكود المجموعة: ${code}\nرابط الانضمام:\n${window.location.origin}/join/${code}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <>
      <button onClick={() => copy("code")} className={`action-btn ${copied === "code" ? "is-ok" : ""}`}>
        <CopyIcon className="ab-ic" />
        {copied === "code" ? UI.codeCopied : UI.copyCode}
      </button>
      <button onClick={() => copy("link")} className={`action-btn ${copied === "link" ? "is-ok" : ""}`}>
        <LinkIcon className="ab-ic" />
        {copied === "link" ? UI.inviteCopied : UI.copyInviteLink}
      </button>
      <button onClick={whatsappInvite} className="action-btn is-wa">
        <WhatsAppIcon className="ab-ic" />
        {UI.inviteViaWhatsApp}
      </button>
    </>
  );
}
