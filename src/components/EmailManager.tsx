"use client";

import { Spinner } from "@/components/Spinner";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUI } from "@/components/I18nProvider";
import { CheckIcon } from "@/components/icons";

// Profile widget: change the account email (DIRECT — no OTP), and optionally
// verify ownership via an emailed code. Login never requires this.
//  - `current`  = the user's email (or null).
//  - `verified` = whether they've confirmed ownership.
//  - `canVerify`= OTP provider is configured (so the verify action is available).
export function EmailManager({
  current,
  verified,
  canVerify,
}: {
  current: string | null;
  verified: boolean;
  canVerify: boolean;
}) {
  const UI = useUI();
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "change" | "verify">("idle");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setMode("idle");
    setEmail("");
    setOtp("");
    setError(null);
  }

  async function post(url: string, body?: unknown): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || UI.otpFailed);
        return false;
      }
      return true;
    } catch {
      setError(UI.connError);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function saveEmail(e: React.FormEvent) {
    e.preventDefault();
    if (await post("/api/account/email/send", { email })) {
      reset();
      router.refresh();
    }
  }

  async function startVerify() {
    if (await post("/api/account/email/verify/start")) setMode("verify");
  }

  async function confirmVerify(e: React.FormEvent) {
    e.preventDefault();
    if (await post("/api/account/email/verify", { otp: otp.trim() })) {
      reset();
      router.refresh();
    }
  }

  return (
    <div className="card mt-6 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
            {UI.emailLabel}
            {current &&
              (verified ? (
                <span className="pill pill-done gap-1 text-lime-400">
                  <CheckIcon className="text-xs" />
                  {UI.emailVerifiedBadge}
                </span>
              ) : (
                <span className="pill pill-locked">{UI.emailUnverifiedBadge}</span>
              ))}
          </div>
          <div className="truncate text-sm text-slate-400" dir="ltr">
            {current || UI.emailNotSet}
          </div>
        </div>
        {mode === "idle" && (
          <div className="flex flex-wrap gap-2">
            {current && !verified && canVerify && (
              <button onClick={startVerify} disabled={busy} className="btn-primary text-sm">
                {busy ? <Spinner /> : UI.verifyEmail}
              </button>
            )}
            <button onClick={() => setMode("change")} className="btn-ghost text-sm">
              {current ? UI.changeEmail : UI.addEmail}
            </button>
          </div>
        )}
      </div>

      {mode === "change" && (
        <form onSubmit={saveEmail} className="mt-4 space-y-3">
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
              {busy ? <Spinner /> : UI.save}
            </button>
            <button type="button" onClick={reset} className="btn-ghost">
              {UI.cancel}
            </button>
          </div>
        </form>
      )}

      {mode === "verify" && (
        <form onSubmit={confirmVerify} className="mt-4 space-y-3">
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
              {busy ? <Spinner /> : UI.otpVerifyBtn}
            </button>
            <button type="button" onClick={reset} className="btn-ghost">
              {UI.cancel}
            </button>
          </div>
        </form>
      )}

      {mode === "idle" && <p className="mt-3 text-xs text-slate-500">{UI.emailVerifyOptional}</p>}
    </div>
  );
}
