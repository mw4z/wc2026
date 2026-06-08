"use client";

import { useRouter } from "next/navigation";
import { useUI } from "./I18nProvider";
import { LogoutIcon } from "./icons";

export function LogoutButton() {
  const UI = useUI();
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }
  return (
    <button
      onClick={logout}
      aria-label={UI.logout}
      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-slate-400 transition hover:bg-white/5 hover:text-white"
    >
      <LogoutIcon className="text-base" />
      <span className="hidden sm:inline">{UI.logout}</span>
    </button>
  );
}
