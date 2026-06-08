"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUI } from "@/components/I18nProvider";

export default function JoinGroupPage() {
  const UI = useUI();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || UI.groupNotFound);
        return;
      }
      router.push(`/groups/${data.groupId}`);
      router.refresh();
    } catch {
      setError(UI.connError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-6 text-2xl font-extrabold">{UI.joinGroup}</h1>
      <form onSubmit={submit} className="card card-accent space-y-4 p-6">
        <div>
          <label className="label">{UI.groupCode}</label>
          <input
            className="input text-center font-mono text-lg tracking-widest"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="CUP-12345"
            inputMode="text"
            autoCapitalize="characters"
            required
          />
          <p className="mt-1 text-xs text-slate-500">{UI.joinCodeFormats}</p>
        </div>
        {error && <p className="rounded-lg bg-danger/15 px-3 py-2 text-sm text-red-300">{error}</p>}
        <button className="btn-gold w-full" disabled={loading || !code.trim()}>
          {loading ? "..." : UI.joinGroup}
        </button>
      </form>
    </div>
  );
}
