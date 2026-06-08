"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { UI } from "@/lib/constants";

export default function LoginPage() {
  // useSearchParams must sit inside a Suspense boundary for static prerender.
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/matches";

  const [name, setName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, employeeId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "تعذّر تسجيل الدخول");
        return;
      }
      router.push(next);
      router.refresh();
    } catch {
      setError("تعذّر الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 text-5xl shadow-[0_10px_40px_rgba(233,185,73,0.45)]">
          🏆
        </div>
        <h1 className="hero-title text-3xl font-black leading-tight">{UI.appName}</h1>
        <p className="mt-2 text-sm text-slate-400">سجّل دخولك للمشاركة في التوقعات</p>
        {/* Host nations 2026 */}
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500">
          {["ca", "mx", "us"].map((c) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={c} src={`/flags/${c}.svg`} alt="" className="flag h-5 w-5" />
          ))}
          <span>كندا · المكسيك · الولايات المتحدة</span>
        </div>
      </div>

      <form onSubmit={onSubmit} className="card card-accent space-y-4 p-6">
        <div>
          <label className="label">الاسم</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="اسمك الكامل"
            required
          />
        </div>
        <div>
          <label className="label">الرقم الوظيفي</label>
          <input
            className="input"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            placeholder="مثال: 12345"
            required
          />
        </div>
        {error && (
          <p className="rounded-lg bg-danger/15 px-3 py-2 text-sm text-red-300">{error}</p>
        )}

        <button className="btn-gold w-full" disabled={loading}>
          {loading ? "..." : UI.login}
        </button>
        <p className="text-center text-xs text-slate-500">
          الرقم الوظيفي هو هويتك. لا حاجة لكلمة مرور.
        </p>
      </form>
    </main>
  );
}
