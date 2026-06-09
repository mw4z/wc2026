"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUI } from "@/components/I18nProvider";
import { DEFAULT_COUNTRY } from "@/lib/countries";
import { CountrySelect } from "@/components/CountrySelect";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <PhoneEntry />
    </Suspense>
  );
}

function PhoneEntry() {
  const UI = useUI();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/matches";

  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [phone, setPhone] = useState("");
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
        body: JSON.stringify({ country, phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || UI.loginFailed);
        return;
      }
      if (data.exists) {
        router.push(next);
      } else {
        // New phone → continue to signup (phone is held in a pending cookie).
        router.push(`/login/signup${next !== "/matches" ? `?next=${encodeURIComponent(next)}` : ""}`);
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
        <p className="mt-1 text-sm text-slate-400">{UI.phoneEntrySubtitle}</p>
      </div>

      <div>
        <label className="label">{UI.phone}</label>
        <div className="flex gap-2">
          <CountrySelect value={country} onChange={setCountry} compact />
          <input
            className="input flex-1"
            type="tel"
            inputMode="tel"
            dir="ltr"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="5XXXXXXXX"
            required
          />
        </div>
      </div>

      {error && <p className="rounded-lg bg-danger/15 px-3 py-2 text-sm text-red-300">{error}</p>}

      <button className="btn-primary w-full" disabled={loading || !phone.trim()}>
        {loading ? "..." : UI.continueBtn}
      </button>

      <p className="text-center text-xs text-slate-400">{UI.phoneEntryHelper}</p>
    </form>
  );
}
