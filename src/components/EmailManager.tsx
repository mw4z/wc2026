"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUI } from "@/components/I18nProvider";

// Profile widget: add or change the account email, verified by an emailed OTP.
// `current` is the user's existing email (or null for legacy phone-era accounts).
export function EmailManager({ current }: { current: string | null }) {
  const UI = useUI();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setOpen(false);
    setStage("email");
    setEmail("");
    setOtp("");
    setError(null);
  }

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/account/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || UI.otpFailed);
        return;
      }
      if (data.otpRequired) {
        setStage("code");
      } else {
        // OTP off → set directly.
        reset();
        router.refresh();
      }
    } catch {
      setError(UI.connError);
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/account/email/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: otp.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || UI.otpFailed);
        return;
      }
      reset();
      router.refresh();
    } catch {
      setError(UI.connError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card mt-6 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-bold text-slate-200">{UI.emailLabel}</div>
          <div className="truncate text-sm text-slate-400" dir="ltr">
            {current || UI.emailNotSet}
          </div>
        </div>
        {!open && (
          <button onClick={() => setOpen(true)} className="btn-ghost text-sm">
            {current ? UI.changeEmail : UI.addEmail}
          </button>
        )}
      </div>

      {open && stage === "email" && (
        <form onSubmit={sendCode} className="mt-4 space-y-3">
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
          {error && <p className="text-sm text-red-300">{error}</p>}
          <div className="flex gap-2">
            <button className="btn-primary flex-1" disabled={busy || !email.trim()}>
              {busy ? "..." : UI.sendCode}
            </button>
            <button type="button" onClick={reset} className="btn-ghost">
              {UI.cancel}
            </button>
          </div>
        </form>
      )}

      {open && stage === "code" && (
        <form onSubmit={verify} className="mt-4 space-y-3">
          <p className="text-xs text-slate-400">{UI.otpSubtitle}</p>
          <input
            className="input text-center font-display text-xl tracking-[0.4em]"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={8}
            dir="ltr"
            placeholder="------"
            required
          />
          {error && <p className="text-sm text-red-300">{error}</p>}
          <div className="flex gap-2">
            <button className="btn-primary flex-1" disabled={busy || otp.trim().length < 4}>
              {busy ? "..." : UI.otpVerifyBtn}
            </button>
            <button type="button" onClick={reset} className="btn-ghost">
              {UI.cancel}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
