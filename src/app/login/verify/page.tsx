"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUI } from "@/components/I18nProvider";

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyForm />
    </Suspense>
  );
}

function VerifyForm() {
  const UI = useUI();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/matches";
  const qs = next !== "/matches" ? `?next=${encodeURIComponent(next)}` : "";

  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNote(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: otp.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || UI.otpFailed);
        return;
      }
      // Existing account → straight into the app; new email → finish signup.
      if (data.exists) router.push(next);
      else router.push(`/login/signup${qs}`);
      router.refresh();
    } catch {
      setError(UI.connError);
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    setError(null);
    setNote(null);
    setResending(true);
    try {
      const res = await fetch("/api/auth/otp/send", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setNote(UI.otpResent);
      else setError(data.error || UI.otpFailed);
    } catch {
      setError(UI.connError);
    } finally {
      setResending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card card-accent space-y-4 p-6">
      <div className="text-center">
        <h2 className="text-lg font-bold text-white">{UI.otpTitle}</h2>
        <p className="mt-1 text-sm text-slate-400">{UI.otpSubtitle}</p>
      </div>

      <div>
        <label className="label">{UI.otpCodeLabel}</label>
        <input
          className="input text-center font-display text-2xl tracking-[0.5em]"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={8}
          dir="ltr"
          placeholder="------"
          required
        />
      </div>

      {error && <p className="rounded-lg bg-danger/15 px-3 py-2 text-sm text-red-300">{error}</p>}
      {note && <p className="rounded-lg bg-ok/15 px-3 py-2 text-sm text-ok">{note}</p>}

      <button className="btn-primary w-full" disabled={loading || otp.trim().length < 4}>
        {loading ? "..." : UI.otpVerifyBtn}
      </button>

      <button
        type="button"
        onClick={resend}
        disabled={resending}
        className="w-full text-center text-sm font-semibold text-accent-400 hover:underline disabled:opacity-50"
      >
        {resending ? "..." : UI.otpResend}
      </button>
    </form>
  );
}
