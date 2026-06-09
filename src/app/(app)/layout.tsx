import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Logo } from "@/components/Logo";
import { AppNav } from "@/components/AppNav";
import { MobileTabBar } from "@/components/MobileTabBar";
import { LogoutButton } from "@/components/LogoutButton";
import { LangToggle } from "@/components/LangToggle";
import { GroupNudge } from "@/components/GroupNudge";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user || !user.isActive) redirect("/login");

  const groupCount = await prisma.groupMember.count({ where: { userId: user.id } });

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-navy-950/85 backdrop-blur-xl">
        <div className="h-[3px] w-full bg-gradient-to-l from-accent-500 via-[#7c5cff] to-lime-500" />
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
          <Link href="/matches" className="min-w-0">
            <Logo />
          </Link>
          <div className="mx-1 hidden h-6 w-px bg-white/10 xl:block" />
          <div className="hidden min-w-0 flex-1 xl:block">
            <AppNav isAdmin={user.role === "ADMIN"} />
          </div>
          <div className="ms-auto flex shrink-0 items-center gap-1 xl:ms-0">
            <LangToggle />
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 pb-24 xl:pb-6">{children}</main>
      <MobileTabBar isAdmin={user.role === "ADMIN"} />
      <GroupNudge hasGroup={groupCount > 0} />
    </div>
  );
}
