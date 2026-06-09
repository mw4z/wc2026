"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useUI } from "@/components/I18nProvider";
import { DEFAULT_COUNTRY } from "@/lib/countries";
import { CountrySelect } from "@/components/CountrySelect";

// Returning-user sign-in (phone only) and new-account sign-up (name + optional
// group) share this form. Both POST /api/auth/login; the server keeps a stored
// name for existing phones and only requires a name when creating an account.
export function AuthForm({ mode }: { mode: "signin" | "signup" }) {
  const UI = useUI();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/matches";
  const qs = params.get("next") ? `?next=${encodeURIComponent(params.get("next")!)}` : "";
  const isSignup = mode === "signup";

  const [name, setName] = useState("");
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [phone, setPhone] = useState("");
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
      const body = isSignup
        ? {
            name,
            country,
            phone,
            groupCode: groupMode === "join" ? groupCode : "",
            newGroupName: groupMode === "create" ? newGroupName : "",
          }
        : { country, phone };

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        // Returning user typed a phone with no account → point them to sign-up.
        if (!isSignup && data.code === "NAME_REQUIRED") setError(UI.noAccountForPhone);
        else setError(data.error || UI.loginFailed);
        return;
      }
      if (data.groupId) {
        router.push(`/groups/${data.groupId}`);
        router.refresh();
        return;
      }
      if (data.groupError) {
        setError(data.groupError);
        return;
      }
      router.push(next);
      router.refresh();
    } catch {
      setError(UI.connError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card card-accent space-y-4 p-6">
      {isSignup && (
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
      )}

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
        {!isSignup && <p className="mt-1 text-xs text-slate-500">{UI.signInWithPhoneHint}</p>}
      </div>

      {isSignup && (
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
            <>
              <input
                className="input text-center font-mono tracking-widest"
                value={groupCode}
                onChange={(e) => setGroupCode(e.target.value)}
                placeholder="CUP-12345"
                inputMode="text"
                autoCapitalize="characters"
              />
              <p className="mt-1 text-xs text-slate-500">{UI.joinCodeHint}</p>
            </>
          ) : (
            <>
              <input
                className="input"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder={UI.groupName}
              />
              <p className="mt-1 text-xs text-slate-500">{UI.createGroupHint}</p>
            </>
          )}
        </div>
      )}

      {error && <p className="rounded-lg bg-danger/15 px-3 py-2 text-sm text-red-300">{error}</p>}

      <button
        className="btn-primary w-full"
        disabled={loading || !phone.trim() || (isSignup && name.trim().length < 2)}
      >
        {loading ? "..." : isSignup ? UI.createAccount : UI.login}
      </button>

      <p className="text-center text-xs text-slate-400">
        {isSignup ? UI.haveAccountQ : UI.noAccountQ}{" "}
        <Link
          href={`${isSignup ? "/login/signin" : "/login/signup"}${qs}`}
          className="font-semibold text-accent-400 hover:underline"
        >
          {isSignup ? UI.login : UI.createAccount}
        </Link>
      </p>
    </form>
  );
}
