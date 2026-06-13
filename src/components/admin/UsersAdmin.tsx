"use client";

import { useMemo, useState } from "react";
import { useUI } from "@/components/I18nProvider";
import { UserRow, type AdminUser } from "@/components/admin/UserRow";

type Filter = "all" | "admins" | "suspended" | "noNotif";

// Searchable, filterable, compact user manager. Avoids endless scrolling: filter
// by name / phone / group, or jump to admins / suspended.
export function UsersAdmin({ users, meId }: { users: AdminUser[]; meId: string }) {
  const UI = useUI();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const notifCount = useMemo(() => users.filter((u) => u.pushEnabled).length, [users]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return users.filter((u) => {
      if (filter === "admins" && u.role !== "ADMIN") return false;
      if (filter === "suspended" && u.isActive) return false;
      if (filter === "noNotif" && u.pushEnabled) return false;
      if (!needle) return true;
      return (
        u.name.toLowerCase().includes(needle) ||
        u.identifier.toLowerCase().includes(needle) ||
        (u.department?.toLowerCase().includes(needle) ?? false) ||
        u.groups.some((g) => g.name.toLowerCase().includes(needle))
      );
    });
  }, [users, q, filter]);

  const chip = (key: Filter, label: string) => (
    <button
      onClick={() => setFilter(key)}
      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
        filter === key ? "bg-accent-500/20 text-accent-300" : "bg-white/5 text-slate-400 hover:bg-white/10"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={UI.admin.searchUsers}
          className="input flex-1 min-w-[180px]"
        />
        <div className="flex flex-wrap items-center gap-1.5">
          {chip("all", UI.admin.filterAll)}
          {chip("admins", UI.admin.filterAdmins)}
          {chip("suspended", UI.admin.filterSuspended)}
          {chip("noNotif", UI.admin.filterNoNotif)}
        </div>
      </div>

      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="text-slate-500">{shown.length} / {users.length}</span>
        <span className="text-slate-400">
          🔔 {UI.admin.notifOn}: <span className="font-bold text-lime-400">{notifCount}</span> / {users.length}
        </span>
      </div>

      <div className="card divide-y divide-white/[0.06] overflow-hidden">
        {shown.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500">{UI.admin.noUsersFound}</p>
        ) : (
          shown.map((u) => <UserRow key={u.id} user={u} isSelf={u.id === meId} />)
        )}
      </div>
    </div>
  );
}
