"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { UI } from "@/lib/constants";
import { DEFAULT_COUNTRY } from "@/lib/countries";
import { CountrySelect } from "@/components/CountrySelect";

export default function LoginPage() {
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
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [phone, setPhone] = useState("");
  const [groupMode, setGroupMode] = useState<"join" | "create">("join");
  const [groupCode, setGroupCode] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Mandatory: must either join by code or create a new group to sign in.
  const groupReady =
    groupMode === "join" ? groupCode.trim().length > 0 : newGroupName.trim().length >= 2;

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
        setError(data.error || "تعذّر تسجيل الدخول");
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
      </div>

      <form onSubmit={onSubmit} className="card card-accent space-y-4 p-6">
        <div>
          <label className="label">{UI.name}</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="اسمك الكامل"
            required
          />
        </div>
        <div>
          <label className="label">رمز الدولة</label>
          <CountrySelect value={country} onChange={setCountry} />
        </div>
        <div>
          <label className="label">{UI.phone}</label>
          <input
            className="input"
            type="tel"
            inputMode="tel"
            dir="ltr"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="05XXXXXXXX"
            required
          />
        </div>
        <div>
          <label className="label">المجموعة</label>
          <div className="mb-2 grid grid-cols-2 gap-1 rounded-xl border border-white/[0.12] bg-navy-800/60 p-1">
            <button
              type="button"
              onClick={() => setGroupMode("join")}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                groupMode === "join" ? "bg-gold-500/20 text-gold-300" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {UI.joinGroup}
            </button>
            <button
              type="button"
              onClick={() => setGroupMode("create")}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                groupMode === "create" ? "bg-gold-500/20 text-gold-300" : "text-slate-400 hover:text-slate-200"
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
                required
              />
              <p className="mt-1 text-xs text-slate-500">
                أدخل كود المجموعة (بأي صيغة: CUP-12345 أو 12345) للانضمام عند الدخول.
              </p>
            </>
          ) : (
            <>
              <input
                className="input"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder={UI.groupName}
                required
              />
              <p className="mt-1 text-xs text-slate-500">
                سيتم إنشاء مجموعة جديدة وستكون أنت قائدها، وتحصل على كود لدعوة زملائك.
              </p>
            </>
          )}
        </div>

        {error && (
          <p className="rounded-lg bg-danger/15 px-3 py-2 text-sm text-red-300">{error}</p>
        )}

        <button
          className="btn-gold w-full"
          disabled={loading || name.trim().length < 2 || !phone.trim() || !groupReady}
        >
          {loading ? "..." : UI.login}
        </button>
        <div className="space-y-1 text-center text-xs text-slate-500">
          <p>استخدم نفس رقم الجوال لاحقًا للعودة إلى حسابك وتوقعاتك.</p>
          <p>لن يظهر رقم الجوال في لوحة الترتيب أو للمشاركين.</p>
        </div>
      </form>
    </main>
  );
}
