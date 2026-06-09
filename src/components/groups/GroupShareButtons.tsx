"use client";

import { useState } from "react";
import { useUI } from "@/components/I18nProvider";

// Copy-to-clipboard retention helpers for a group. The shared MESSAGE text is
// Arabic-first (it's meant to be pasted into WhatsApp etc.); button labels are
// localized. No data sent anywhere — pure clipboard.
export function GroupShareButtons({
  code,
  points,
  rank,
}: {
  code: string;
  points?: number | null;
  rank?: number | null;
}) {
  const UI = useUI();
  const [copied, setCopied] = useState<"reminder" | "result" | null>(null);

  const link = () => `${window.location.origin}/join/${code}`;
  async function copy(text: string, which: "reminder" | "result") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  const reminder = () =>
    `تذكير سريع ⚽\nلا تنسون توقعات مباريات اليوم قبل بداية كل مباراة.\nرابط المجموعة:\n${link()}\nكود المجموعة: ${code}`;
  const result = () =>
    `نتيجتي في توقعات كأس 2026:\n${points} نقطة\nمركزي في المجموعة: ${rank}\nرابط المجموعة:\n${link()}`;

  return (
    <div className="flex flex-wrap gap-2">
      <button onClick={() => copy(reminder(), "reminder")} className="btn-ghost text-sm">
        {copied === "reminder" ? UI.reminderCopied : UI.copyGroupReminder}
      </button>
      {points != null && points > 0 && rank != null && (
        <button onClick={() => copy(result(), "result")} className="btn-ghost text-sm">
          {copied === "result" ? UI.resultCopied : UI.shareMyResult}
        </button>
      )}
    </div>
  );
}
