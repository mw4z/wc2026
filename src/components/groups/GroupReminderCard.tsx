"use client";

import { useState } from "react";
import { useUI } from "@/components/I18nProvider";
import { BellIcon, WhatsAppIcon, CopyIcon } from "@/components/icons";

export interface ReminderMatch {
  id: string;
  label: string; // dropdown label: "🇲🇽 المكسيك × جنوب أفريقيا 🇿🇦 — اليوم 10:00 م"
  matchText: string; // "🇲🇽 المكسيك × جنوب أفريقيا 🇿🇦"
  time: string; // full Riyadh time
  url: string; // "/matches/<id>"
}

// Leader-only: pick a specific open match and copy / WhatsApp a reminder that
// names the exact match (with flags) + kickoff time + group link + code.
export function GroupReminderCard({ matches, code }: { matches: ReminderMatch[]; code: string }) {
  const UI = useUI();
  const g = UI.gpage;
  const [sel, setSel] = useState(matches[0]?.id ?? "");
  const [copied, setCopied] = useState(false);

  if (matches.length === 0) return null;
  const m = matches.find((x) => x.id === sel) ?? matches[0];

  function build(): string {
    if (!m) return "";
    const groupLink = `${window.location.origin}/join/${code}`;
    const linkBlock = `${g.reminderGroupLink}\n${groupLink}\n`;
    return g.reminderText
      .replace("{match}", m.matchText)
      .replace("{time}", m.time)
      .replace("{linkBlock}", linkBlock)
      .replace("{code}", code);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(build());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  function whatsapp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(build())}`, "_blank", "noopener,noreferrer");
  }

  return (
    <section className="card p-5">
      <h2 className="mb-1 flex items-center gap-2 font-bold text-gold-400">
        <BellIcon className="text-base" />
        {g.reminderTitle}
      </h2>
      <p className="mb-3 text-xs text-slate-400">{g.reminderDesc}</p>

      <label className="label">{g.chooseMatch}</label>
      <select value={sel} onChange={(e) => setSel(e.target.value)} className="input mb-3 w-full">
        {matches.map((x) => (
          <option key={x.id} value={x.id}>
            {x.label}
          </option>
        ))}
      </select>

      <button onClick={whatsapp} className="btn-primary flex w-full items-center justify-center gap-2">
        <WhatsAppIcon className="text-base" />
        {g.sendWhatsApp}
      </button>
      <button onClick={copy} className="btn-ghost mt-2 flex w-full items-center justify-center gap-1.5 text-sm">
        <CopyIcon className="text-base" />
        {copied ? g.reminderCopied : g.copyReminder}
      </button>
    </section>
  );
}
