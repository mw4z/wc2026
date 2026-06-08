"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UI } from "@/lib/constants";

export default function NewGroupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "تعذّر إنشاء المجموعة");
        return;
      }
      router.push(`/groups/${data.group.id}`);
      router.refresh();
    } catch {
      setError("تعذّر الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-6 text-2xl font-extrabold">{UI.createGroup}</h1>
      <form onSubmit={submit} className="card card-accent space-y-4 p-6">
        <div>
          <label className="label">{UI.groupName}</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثال: فريق التسويق"
            required
          />
        </div>
        {error && <p className="rounded-lg bg-danger/15 px-3 py-2 text-sm text-red-300">{error}</p>}
        <button className="btn-gold w-full" disabled={loading || name.trim().length < 2}>
          {loading ? "..." : UI.createGroup}
        </button>
        <p className="text-center text-xs text-slate-500">سيتم توليد كود دعوة تلقائيًا، وتصبح أنت قائد المجموعة.</p>
      </form>
    </div>
  );
}
