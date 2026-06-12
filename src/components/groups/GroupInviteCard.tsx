"use client";

import { useState } from "react";
import { useUI } from "@/components/I18nProvider";
import { WhatsAppIcon, CopyIcon, LinkIcon } from "@/components/icons";

// Invite card: prominent code + a primary "invite via WhatsApp" + compact copy
// actions. WhatsApp text only opens wa.me (no phone number, no API).
export function GroupInviteCard({ code }: { code: string }) {
  const UI = useUI();
  const g = UI.gpage;
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  const link = () => `${window.location.origin}/join/${code}`;

  async function copy(kind: "code" | "link") {
    try {
      await navigator.clipboard.writeText(kind === "link" ? link() : code);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  function whatsapp() {
    const msg = g.inviteText.replace("{code}", code).replace("{link}", link());
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <section className="card p-5">
      <h2 className="mb-1 font-bold text-gold-400">{g.inviteTitle}</h2>
      <p className="mb-3 text-xs text-slate-400">{g.inviteHint}</p>
      <div className="mb-3 text-center">
        <span className="rounded-xl border border-gold-500/40 bg-gold-500/10 px-5 py-2 font-mono text-2xl font-bold tracking-[0.3em] text-gold-300">
          {code}
        </span>
      </div>
      <button onClick={whatsapp} className="btn-primary flex w-full items-center justify-center gap-2">
        <WhatsAppIcon className="text-base" />
        {UI.inviteViaWhatsApp}
      </button>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button onClick={() => copy("link")} className="btn-ghost flex items-center justify-center gap-1.5 text-sm">
          <LinkIcon className="text-base" />
          {copied === "link" ? UI.inviteCopied : g.copyLink}
        </button>
        <button onClick={() => copy("code")} className="btn-ghost flex items-center justify-center gap-1.5 text-sm">
          <CopyIcon className="text-base" />
          {copied === "code" ? UI.codeCopied : UI.copyCode}
        </button>
      </div>
    </section>
  );
}
