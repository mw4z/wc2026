"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUI } from "@/components/I18nProvider";
import { DEFAULT_COUNTRY } from "@/lib/countries";
import { CountrySelect } from "@/components/CountrySelect";
import { BrandMark } from "@/components/Logo";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const UI = useUI();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/matches";

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
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          country,
          phone,
          groupCode: groupMode === "join" ? groupCode : "",
          newGroupName: groupMode === "create" ? newGroupName : "",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || UI.loginFailed);
        return;
      }
      // Joined a group at sign-in → go straight to it.
      if (data.groupId) {
        router.push(`/groups/${data.groupId}`);
        router.refresh();
        return;
      }
      // Signed in, but joining/creating the group failed — stay so they can fix it.
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
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5">
      <div className="mb-8 text-center">
        <BrandMark className="mx-auto mb-4 h-16 w-16 drop-shadow-[0_8px_30px_rgba(43,123,255,0.45)]" />
        <span className="font-display text-[11px] font-bold uppercase tracking-widest2 text-accent-400">
          {UI.worldCup26}
        </span>
        <h1 className="hero-title mt-1 text-3xl font-extrabold leading-tight">{UI.appName}</h1>
        <p className="mt-2 text-sm text-slate-400">{UI.loginSubtitle}</p>
      </div>

      <form onSubmit={onSubmit} className="card card-accent space-y-4 p-6">
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
        <div>
          <label className="label">
            {UI.group} <span className="font-normal text-slate-500">{UI.groupOptional}</span>
          </label>
          <p className="mb-2 text-xs text-slate-500">{UI.groupLoginHint}</p>
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

        {error && (
          <p className="rounded-lg bg-danger/15 px-3 py-2 text-sm text-red-300">{error}</p>
        )}

        <button
          className="btn-primary w-full"
          disabled={loading || name.trim().length < 2 || !phone.trim()}
        >
          {loading ? "..." : UI.login}
        </button>
        <div className="space-y-1 text-center text-xs text-slate-500">
          <p>{UI.loginFooter1}</p>
          <p>{UI.loginFooter2}</p>
        </div>
      </form>
    </main>
  );
}
