import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { UI } from "@/lib/constants";
import { LogoutButton } from "@/components/LogoutButton";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user || !user.isActive) redirect("/login");

  const links = [
    { href: "/matches", label: UI.matches },
    { href: "/leaderboard", label: UI.leaderboard },
    { href: "/rules", label: UI.rules },
    { href: "/profile", label: UI.profile },
  ];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-navy-950/80 backdrop-blur-xl">
        <div className="h-0.5 w-full bg-gradient-to-l from-gold-400 via-[#16c79a] to-[#d6336c]" />
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/matches" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 text-lg shadow-[0_4px_14px_rgba(233,185,73,0.4)]">
              🏆
            </span>
            <span className="hidden text-base font-extrabold text-slate-100 sm:inline">
              {UI.appName}
            </span>
          </Link>
          <nav className="flex items-center gap-1 text-sm font-semibold">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-lg px-3 py-1.5 text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                {l.label}
              </Link>
            ))}
            {user.role === "ADMIN" && (
              <Link
                href="/admin"
                className="rounded-lg px-3 py-1.5 text-gold-400 transition hover:bg-gold-500/10"
              >
                {UI.adminPanel}
              </Link>
            )}
          </nav>
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
