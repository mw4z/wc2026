import Link from "next/link";
import { Logo } from "@/components/Logo";
import { AppNav } from "@/components/AppNav";
import { MobileTabBar } from "@/components/MobileTabBar";
import { LogoutButton } from "@/components/LogoutButton";
import { LangToggle } from "@/components/LangToggle";

// The authenticated app chrome (header + inline/bottom nav). Shared by the (app)
// layout and the (public) layout when the visitor is logged in, so public pages
// like /rules stay inside the app instead of showing the marketing shell.
export function AppShell({ isAdmin, children }: { isAdmin: boolean; children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-navy-950/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
          <Link href="/matches" className="min-w-0">
            <Logo />
          </Link>
          <div className="mx-1 hidden h-6 w-px bg-white/10 xl:block" />
          <div className="hidden min-w-0 flex-1 xl:block">
            <AppNav isAdmin={isAdmin} />
          </div>
          <div className="ms-auto flex shrink-0 items-center gap-1 xl:ms-0">
            <LangToggle />
            <LogoutButton />
          </div>
        </div>
        <div className="h-[3px] w-full bg-gradient-to-l from-accent-500 via-[#7c5cff] to-lime-500" />
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 pb-28 xl:pb-6">{children}</main>
      <MobileTabBar isAdmin={isAdmin} />
    </div>
  );
}
