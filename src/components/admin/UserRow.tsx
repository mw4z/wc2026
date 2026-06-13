"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUI } from "@/components/I18nProvider";
import { BellIcon } from "@/components/icons";

export interface AdminUser {
  id: string;
  identifier: string; // phone (E.164) / email / legacy id — admin-only view
  name: string;
  department: string | null;
  role: "USER" | "ADMIN";
  isActive: boolean;
  pushEnabled: boolean;
  groups: { id: string; name: string }[];
}

export function UserRow({ user, isSelf }: { user: AdminUser; isSelf: boolean }) {
  const UI = useUI();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(user.name);
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState(false);

  async function patch(body: Partial<AdminUser>) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) router.refresh();
      else alert((await res.json()).error || UI.admin.editFailed);
    } finally {
      setBusy(false);
      setEditing(false);
    }
  }

  async function remove() {
    if (!confirm(`${user.name} — ${UI.admin.deleteUserConfirm}`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
      if (res.ok) router.refresh();
      else alert((await res.json()).error || UI.admin.deleteUserFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="px-3 py-2.5">
      {/* compact summary line */}
      <div className="flex items-center gap-3">
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${user.isActive ? "bg-lime-400" : "bg-red-400"}`}
          title={user.isActive ? UI.admin.statusActive : UI.admin.statusSuspended}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {editing ? (
              <input className="input h-7 w-40 py-1" value={name} onChange={(e) => setName(e.target.value)} />
            ) : (
              <Link href={`/admin/users/${user.id}`} className="truncate font-semibold text-gold-300 hover:underline">
                {user.name}
              </Link>
            )}
            {user.role === "ADMIN" && (
              <span className="badge bg-accent-500/20 text-accent-300">{UI.roleAdmin}</span>
            )}
            <span title={user.pushEnabled ? UI.admin.notifOn : UI.admin.notifOff} className="inline-flex">
              <BellIcon className={user.pushEnabled ? "text-sm text-lime-400" : "text-sm text-slate-600"} />
            </span>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-400">
            <span dir="ltr" className="font-mono">{user.identifier}</span>
            {user.department && <span>· {user.department}</span>}
            <span>· {user.groups.length} {UI.groups}</span>
          </div>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="shrink-0 rounded-lg px-2 py-1 text-slate-400 hover:bg-white/10 hover:text-white"
          aria-label={UI.admin.actions}
        >
          {open ? "▲" : "⋯"}
        </button>
      </div>

      {/* expanded: groups + actions */}
      {open && (
        <div className="mt-3 space-y-3 border-t border-white/[0.06] pt-3">
          <div>
            <div className="mb-1 text-xs font-semibold text-slate-500">{UI.groups}</div>
            {user.groups.length === 0 ? (
              <span className="text-xs text-slate-500">{UI.admin.noGroups}</span>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {user.groups.map((g) => (
                  <Link
                    key={g.id}
                    href={`/groups/${g.id}/leaderboard`}
                    className="rounded-md bg-white/5 px-2 py-0.5 text-xs text-slate-300 hover:bg-white/10"
                  >
                    {g.name}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {editing ? (
              <button onClick={() => patch({ name })} disabled={busy} className="rounded bg-gold-500 px-2 py-1 text-xs text-navy-950">{UI.save}</button>
            ) : (
              <button onClick={() => setEditing(true)} className="rounded border border-white/15 px-2 py-1 text-xs">{UI.admin.editName}</button>
            )}
            {!isSelf && (
              <>
                <button onClick={() => patch({ isActive: !user.isActive })} disabled={busy} className="rounded border border-white/15 px-2 py-1 text-xs">
                  {user.isActive ? UI.admin.suspend : UI.admin.activate}
                </button>
                <button onClick={() => patch({ role: user.role === "ADMIN" ? "USER" : "ADMIN" })} disabled={busy} className="rounded border border-white/15 px-2 py-1 text-xs">
                  {user.role === "ADMIN" ? UI.admin.removeAdmin : UI.admin.makeAdmin}
                </button>
                <button onClick={remove} disabled={busy} className="rounded border border-danger/50 px-2 py-1 text-xs text-red-300 hover:bg-danger/10">
                  {UI.admin.delete}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
