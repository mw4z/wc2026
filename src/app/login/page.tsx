"use client";

import { Spinner } from "@/components/Spinner";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUI } from "@/components/I18nProvider";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <EmailEntry />
    </Suspense>
  );
}

function EmailEntry() {
  const UI = useUI();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/matches";

  const [email, setEmail] = useState("");
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
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || UI.loginFailed);
        return;
      }
      const qs = next !== "/matches" ? `?next=${encodeURIComponent(next)}` : "";
      if (data.otpRequired) {
        // Email a code, then verify on the next step (existing → in, new → signup).
        router.push(`/login/verify${qs}`);
      } else if (data.exists) {
        // OTP off + existing account → straight in.
        router.push(next);
      } else {
        // OTP off + new email → signup (email held in a pending cookie).
        router.push(`/login/signup${qs}`);
      }
      router.refresh();
    } catch {
      setError(UI.connError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card card-accent space-y-4 p-6">
      <div className="text-center">
        <h2 className="text-lg font-bold text-white">{UI.loginTitle}</h2>
        <p className="mt-1 text-sm text-slate-400">{UI.emailEntrySubtitle}</p>
      </div>

      <div>
        <label className="label">{UI.emailLabel}</label>
        <input
          className="input"
          type="email"
          inputMode="email"
          autoComplete="email"
          dir="ltr"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={UI.emailPlaceholder}
          required
        />
      </div>

      {error && <p className="rounded-lg bg-danger/15 px-3 py-2 text-sm text-red-300">{error}</p>}

      <button className="btn-primary w-full" disabled={loading || !email.trim()}>
        {loading ? <Spinner /> : UI.continueBtn}
      </button>

      <p className="text-center text-xs text-slate-400">{UI.emailEntryHelper}</p>
    </form>
  );
}
