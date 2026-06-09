"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUI } from "@/components/I18nProvider";

// Step 2 form. Phone is read-only (verified in step 1, held in a pending cookie).
export function SignupForm({ phone }: { phone: string }) {
  const UI = useUI();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/matches";

  const [name, setName] = useState("");
  const [groupMode, setGroupMode] = useState<"join" | "create">("join");
  const [groupCode, setGroupCode] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          groupCode: groupMode === "join" ? groupCode : "",
          newGroupName: groupMode === "create" ? newGroupName : "",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        // pending expired → restart at /login; otherwise keep the form values.
        if (data.code === "NO_PENDING") {
          router.push("/login");
          return;
        }
        setError(data.error || UI.loginFailed);
        return;
      }
      router.push(data.groupId ? `/groups/${data.groupId}` : next);
      router.refresh();
    } catch {
      setError(UI.connError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card card-accent space-y-4 p-6">
      <div>
        <label className="label">{UI.phone}</label>
        <div className="input flex items-center bg-navy-800/40 text-slate-300" dir="ltr">
          {phone}
        </div>
      </div>

      <div>
        <label className="label">{UI.name}</label>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={UI.fullNamePlaceholder}
          required
        />
      </div>

      <div>
        <label className="label">
          {UI.group} <span className="font-normal text-slate-500">{UI.groupOptional}</span>
        </label>
        <div className="mb-2 grid grid-cols-2 gap-1 rounded-xl border border-white/[0.12] bg-navy-800/60 p-1">
          <button
            type="button"
            onClick={() => setGroupMode("join")}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              groupMode === "join" ? "bg-accent-500/15 text-accent-400" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {UI.joinGroup}
          </button>
          <button
            type="button"
            onClick={() => setGroupMode("create")}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              groupMode === "create" ? "bg-accent-500/15 text-accent-400" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {UI.createGroup}
          </button>
        </div>
        {groupMode === "join" ? (
          <input
            className="input text-center font-mono tracking-widest"
            value={groupCode}
            onChange={(e) => setGroupCode(e.target.value)}
            placeholder="CUP-12345"
            inputMode="text"
            autoCapitalize="characters"
          />
        ) : (
          <input
            className="input"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder={UI.groupName}
          />
        )}
        <p className="mt-1 text-xs text-slate-500">{UI.signupGroupHelper}</p>
      </div>

      {error && <p className="rounded-lg bg-danger/15 px-3 py-2 text-sm text-red-300">{error}</p>}

      <button className="btn-primary w-full" disabled={loading || name.trim().length < 2}>
        {loading ? "..." : UI.createAccount}
      </button>
    </form>
  );
}
