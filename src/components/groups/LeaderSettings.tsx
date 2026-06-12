"use client";

import { useState } from "react";
import Link from "next/link";
import { useUI } from "@/components/I18nProvider";
import { SlidersIcon } from "@/components/icons";
import { GroupRename } from "./GroupRename";
import { RegenerateCodeButton } from "./RegenerateCodeButton";
import { AwardsToggle } from "./AwardsToggle";

// Low-priority, collapsible leader-only tools, kept at the bottom so they don't
// compete with the daily actions.
export function LeaderSettings({
  groupId,
  groupName,
  awardsEnabled,
}: {
  groupId: string;
  groupName: string;
  awardsEnabled: boolean;
}) {
  const UI = useUI();
  const g = UI.gpage;
  const [open, setOpen] = useState(false);

  return (
    <section className="mt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="btn-ghost flex w-full items-center justify-center gap-1.5 text-sm text-slate-300"
      >
        <SlidersIcon className="text-base" />
        {open ? g.leaderSettings : g.showLeaderSettings}
        <span className="text-xs text-slate-500">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="card mt-2 space-y-4 p-5">
          <h2 className="font-bold text-gold-400">{g.leaderSettings}</h2>

          <div>
            <GroupRename groupId={groupId} currentName={groupName} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <RegenerateCodeButton groupId={groupId} />
            <Link href={`/groups/${groupId}/scoring`} className="btn-ghost text-sm">
              {UI.gscore.settingsBtn}
            </Link>
          </div>

          <AwardsToggle groupId={groupId} enabled={awardsEnabled} />
        </div>
      )}
    </section>
  );
}
