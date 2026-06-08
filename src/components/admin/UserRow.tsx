"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface U {
  id: string;
  employeeId: string;
  name: string;
  department: string | null;
  role: "USER" | "ADMIN";
  isActive: boolean;
}

export function UserRow({ user, isSelf }: { user: U; isSelf: boolean }) {
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
      else alert((await res.json()).error || "فشل التعديل");
    } finally {
      setBusy(false);
      setEditing(false);
    }
  }

  return (
    <tr className="border-b border-navy-800">
      <td className="p-3 font-mono text-xs">{user.employeeId}</td>
      <td className="p-3">
        {editing ? (
          <input className="input w-32" value={name} onChange={(e) => setName(e.target.value)} />
        ) : (
          <span className="font-semibold">{user.name}</span>
        )}
      </td>
      <td className="p-3 text-slate-400">{user.department ?? "—"}</td>
      <td className="p-3">{user.role === "ADMIN" ? "مدير" : "مشارك"}</td>
      <td className="p-3">
        <span className={user.isActive ? "text-ok" : "text-red-400"}>
          {user.isActive ? "نشط" : "موقوف"}
        </span>
      </td>
      <td className="flex flex-wrap gap-1 p-3">
        {editing ? (
          <button onClick={() => patch({ name })} disabled={busy} className="rounded bg-gold-500 px-2 py-1 text-xs text-navy-950">حفظ</button>
        ) : (
          <button onClick={() => setEditing(true)} className="rounded border border-navy-600 px-2 py-1 text-xs">تعديل الاسم</button>
        )}
        {!isSelf && (
          <>
            <button onClick={() => patch({ isActive: !user.isActive })} disabled={busy} className="rounded border border-navy-600 px-2 py-1 text-xs">
              {user.isActive ? "إيقاف" : "تفعيل"}
            </button>
            <button onClick={() => patch({ role: user.role === "ADMIN" ? "USER" : "ADMIN" })} disabled={busy} className="rounded border border-navy-600 px-2 py-1 text-xs">
              {user.role === "ADMIN" ? "إزالة الإدارة" : "ترقية لمدير"}
            </button>
          </>
        )}
      </td>
    </tr>
  );
}
