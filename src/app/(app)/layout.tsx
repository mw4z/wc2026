import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { AppNav } from "@/components/AppNav";
import { LogoutButton } from "@/components/LogoutButton";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user || !user.isActive) redirect("/login");

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-navy-950/85 backdrop-blur-xl">
        <div className="h-[3px] w-full bg-gradient-to-l from-accent-500 via-[#7c5cff] to-lime-500" />
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2.5">
          <Link href="/matches" className="shrink-0">
            <Logo />
          </Link>
          <div className="mx-1 hidden h-6 w-px bg-white/10 sm:block" />
          <div className="min-w-0 flex-1">
            <AppNav isAdmin={user.role === "ADMIN"} />
          </div>
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
