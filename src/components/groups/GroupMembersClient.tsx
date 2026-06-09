"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUI } from "../I18nProvider";
import { CopyCode } from "./CopyCode";

interface Member {
  userId: string;
  name: string;
  department: string | null;
  role: "LEADER" | "MEMBER";
}

export function GroupMembersClient({
  groupId,
  isLeader,
  leaderId,
  currentUserId,
  groupName,
  code,
  members,
}: {
  groupId: string;
  isLeader: boolean;
  leaderId: string;
  currentUserId: string;
  groupName: string;
  code: string;
  members: Member[];
}) {
  const UI = useUI();
  const router = useRouter();
  const [name, setName] = useState(groupName);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function call(url: string, method: string, body?: unknown) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data.error || UI.actionFailed);
        return false;
      }
      return true;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {isLeader && (
        <div className="card space-y-4 p-5">
          <div>
            <label className="label">{UI.groupCode}</label>
            <div className="flex flex-wrap items-center gap-2">
              <CopyCode code={code} />
              <button
                onClick={async () => {
                  if (await call(`/api/groups/${groupId}/regenerate`, "POST")) router.refresh();
                }}
                disabled={busy}
                className="btn-ghost text-sm"
              >
                {UI.regenerateCode}
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-500">{UI.regenerateNote}</p>
          </div>
          <div>
            <label className="label">{UI.groupName}</label>
            <div className="flex gap-2">
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
              <button
                onClick={async () => {
                  if (await call(`/api/groups/${groupId}`, "PATCH", { name })) router.refresh();
                }}
                disabled={busy || name.trim().length < 2}
                className="btn-gold text-sm"
              >
                {UI.save}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-right text-sm">
          <thead className="border-b border-white/10 text-xs text-slate-400">
            <tr>
              <th className="p-3">{UI.name}</th>
              <th className="hidden p-3 sm:table-cell">{UI.department}</th>
              <th className="p-3">{UI.roleColumn}</th>
              {isLeader && <th className="p-3"></th>}
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.userId} className="border-b border-white/5">
                <td className="p-3 font-semibold">{m.name}</td>
                <td className="hidden p-3 text-slate-400 sm:table-cell">{m.department ?? "—"}</td>
                <td className="p-3">{m.role === "LEADER" ? UI.groupLeader : UI.memberRole}</td>
                {isLeader && (
                  <td className="p-3">
                    {m.userId !== leaderId && (
                      <button
                        onClick={async () => {
                          if (await call(`/api/groups/${groupId}/members/${m.userId}`, "DELETE"))
                            router.refresh();
                        }}
                        disabled={busy}
                        className="rounded border border-danger/50 px-2 py-1 text-xs text-red-300"
                      >
                        {UI.removeMember}
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {msg && <p className="text-center text-sm text-red-300">{msg}</p>}

      {!isLeader && currentUserId !== leaderId && (
        <button
          onClick={async () => {
            if (!confirm(UI.leaveGroupConfirm)) return;
            if (await call(`/api/groups/${groupId}/leave`, "POST")) {
              router.push("/groups");
              router.refresh();
            }
          }}
          disabled={busy}
          className="btn-ghost w-full text-red-300"
        >
          {UI.leaveGroup}
        </button>
      )}
    </div>
  );
}
