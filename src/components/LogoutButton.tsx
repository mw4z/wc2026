"use client";

import { useRouter } from "next/navigation";
import { UI } from "@/lib/constants";

export function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }
  return (
    <button onClick={logout} className="rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:bg-navy-800">
      {UI.logout}
    </button>
  );
}
