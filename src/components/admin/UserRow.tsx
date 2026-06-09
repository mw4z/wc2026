"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUI } from "@/components/I18nProvider";

interface U {
  id: string;
  identifier: string; // phone (E.164) or legacy employee id — admin-only view
  name: string;
  department: string | null;
  role: "USER" | "ADMIN";
  isActive: boolean;
}

export function UserRow({ user, isSelf }: { user: U; isSelf: boolean }) {
  const UI = useUI();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(user.name);
  const [editing, setEditing] = useState(false);

  async function patch(body: Partial<U>) {
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
    <tr className="border-b border-navy-800">
      <td className="p-3 font-mono text-xs" dir="ltr">{user.identifier}</td>
      <td className="p-3">
        {editing ? (
          <input className="input w-32" value={name} onChange={(e) => setName(e.target.value)} />
        ) : (
          <Link href={`/admin/users/${user.id}`} className="font-semibold text-gold-300 hover:underline">
            {user.name}
          </Link>
        )}
      </td>
      <td className="p-3 text-slate-400">{user.department ?? "—"}</td>
      <td className="p-3">{user.role === "ADMIN" ? UI.roleAdmin : UI.roleUser}</td>
      <td className="p-3">
        <span className={user.isActive ? "text-ok" : "text-red-400"}>
          {user.isActive ? UI.admin.statusActive : UI.admin.statusSuspended}
        </span>
      </td>
      <td className="flex flex-wrap gap-1 p-3">
        {editing ? (
          <button onClick={() => patch({ name })} disabled={busy} className="rounded bg-gold-500 px-2 py-1 text-xs text-navy-950">{UI.save}</button>
        ) : (
          <button onClick={() => setEditing(true)} className="rounded border border-navy-600 px-2 py-1 text-xs">{UI.admin.editName}</button>
        )}
        {!isSelf && (
          <>
            <button onClick={() => patch({ isActive: !user.isActive })} disabled={busy} className="rounded border border-navy-600 px-2 py-1 text-xs">
              {user.isActive ? UI.admin.suspend : UI.admin.activate}
            </button>
            <button onClick={() => patch({ role: user.role === "ADMIN" ? "USER" : "ADMIN" })} disabled={busy} className="rounded border border-navy-600 px-2 py-1 text-xs">
              {user.role === "ADMIN" ? UI.admin.removeAdmin : UI.admin.makeAdmin}
            </button>
            <button onClick={remove} disabled={busy} className="rounded border border-danger/50 px-2 py-1 text-xs text-red-300 hover:bg-danger/10">
              {UI.admin.delete}
            </button>
          </>
        )}
      </td>
    </tr>
  );
}
