"use client";

import { useUI } from "@/components/I18nProvider";
import { ShareIcon } from "@/components/icons";

// "Share my result" only (the group reminder is now match-specific — see
// GroupReminderCard). Arabic-first WhatsApp text; nothing is sent anywhere.
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
  if (points == null || points <= 0 || rank == null) return null;

  const result = () =>
    `نتيجتي في توقعات كأس 2026:\n${points} نقطة\nمركزي في المجموعة: ${rank}\nرابط المجموعة:\n${window.location.origin}/join/${code}`;

  return (
    <button
      onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(result())}`, "_blank", "noopener,noreferrer")}
      className="btn-ghost flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap text-sm"
    >
      <ShareIcon className="text-base" />
      {UI.shareMyResult}
    </button>
  );
}
