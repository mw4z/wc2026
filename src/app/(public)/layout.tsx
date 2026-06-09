import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { BrandMark } from "@/components/Logo";
import { AppShell } from "@/components/AppShell";

export const dynamic = "force-dynamic";

// Public marketing/legal shell (no auth). Arabic-first, RTL. These pages exist
// so the site reads as a real product (for users and ad review), not a login wall.
const NAV = [
  { href: "/", label: "الرئيسية" },
  { href: "/rules", label: "القواعد" },
  { href: "/faq", label: "الأسئلة الشائعة" },
  { href: "/privacy", label: "الخصوصية" },
  { href: "/terms", label: "الشروط" },
  { href: "/contact", label: "تواصل معنا" },
];

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  // Logged-in visitors keep the app chrome on public pages (e.g. /rules) instead
  // of seeing the marketing/landing shell.
  const user = await getCurrentUser();
  if (user && user.isActive) {
    return <AppShell isAdmin={user.role === "ADMIN"}>{children}</AppShell>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-navy-950/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="h-[3px] w-full bg-gradient-to-l from-accent-500 via-[#7c5cff] to-lime-500" />
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <BrandMark className="h-8 w-8" />
            <span className="font-extrabold text-white">توقعات كأس 2026</span>
          </Link>
          <nav className="ms-auto hidden items-center gap-1 text-sm font-semibold md:flex">
            {NAV.map((l) => (
              <Link key={l.href} href={l.href} className="rounded-lg px-3 py-1.5 text-slate-300 hover:bg-white/10 hover:text-white">
                {l.label}
              </Link>
            ))}
          </nav>
          <Link href="/matches" className="btn-primary ms-auto text-sm md:ms-2">
            ابدأ الآن
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">{children}</main>

      <footer className="border-t border-white/10 bg-navy-950/60">
        <div className="mx-auto max-w-5xl px-4 pt-8 pb-16 text-sm text-slate-400">
          <nav className="mb-4 flex flex-wrap gap-x-4 gap-y-2">
            {NAV.map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-white">
                {l.label}
              </Link>
            ))}
          </nav>
          <p className="text-xs text-slate-500">
            هذا الموقع لعبة توقعات للترفيه والمنافسة بين الأصدقاء، وغير مرتبط رسميًا بالاتحاد الدولي لكرة القدم
            (FIFA). جميع العلامات التجارية تعود لأصحابها.
          </p>
          <p className="mt-2 text-xs text-slate-600">© 2026 توقعات كأس 2026</p>
        </div>
      </footer>
    </div>
  );
}
