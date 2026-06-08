"use client";

import { useState } from "react";
import { useUI } from "../I18nProvider";

export function CopyCode({ code }: { code: string }) {
  const UI = useUI();
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }
  return (
    <div className="flex items-center gap-2">
      <span className="rounded-lg border border-gold-500/40 bg-gold-500/10 px-3 py-1.5 font-mono text-lg font-bold tracking-widest text-gold-300">
        {code}
      </span>
      <button onClick={copy} className="btn-ghost px-3 py-1.5 text-sm">
        {copied ? UI.codeCopied : UI.copyCode}
      </button>
    </div>
  );
}
