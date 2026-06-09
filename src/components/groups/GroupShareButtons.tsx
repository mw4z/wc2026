"use client";

import { useState } from "react";
import { useUI } from "@/components/I18nProvider";
import { BellIcon, ShareIcon } from "@/components/icons";

// Reminder / result share actions as uniform grid-item buttons (parent supplies
// the grid). Messages are Arabic-first (meant for WhatsApp); no data sent anywhere.
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
  const [copied, setCopied] = useState(false);

  const link = () => `${window.location.origin}/join/${code}`;
  const reminder = () =>
    `تذكير سريع ⚽\nلا تنسون توقعات مباريات اليوم قبل بداية كل مباراة.\nرابط المجموعة:\n${link()}\nكود المجموعة: ${code}`;
  const result = () =>
    `نتيجتي في توقعات كأس 2026:\n${points} نقطة\nمركزي في المجموعة: ${rank}\nرابط المجموعة:\n${link()}`;

  async function copyReminder() {
    try {
      await navigator.clipboard.writeText(reminder());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }
  const whatsapp = (text: string) =>
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");

  return (
    <>
      <button onClick={copyReminder} className={`action-btn ${copied ? "is-ok" : ""}`}>
        <BellIcon className="ab-ic" />
        {copied ? UI.reminderCopied : UI.copyGroupReminder}
      </button>
      {points != null && points > 0 && rank != null && (
        <button onClick={() => whatsapp(result())} className="action-btn is-wa">
          <ShareIcon className="ab-ic" />
          {UI.shareMyResult}
        </button>
      )}
    </>
  );
}
