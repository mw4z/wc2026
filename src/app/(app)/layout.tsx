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
      <header className="sticky top-0 z-20 border-b border-navy-700 bg-navy-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/matches" className="flex items-center gap-2 font-extrabold text-gold-400">
            <span>🏆</span>
            <span className="hidden sm:inline">{UI.appName}</span>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="rounded-lg px-3 py-1.5 hover:bg-navy-800">
                {l.label}
              </Link>
            ))}
            {user.role === "ADMIN" && (
              <Link href="/admin" className="rounded-lg px-3 py-1.5 text-gold-400 hover:bg-navy-800">
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
