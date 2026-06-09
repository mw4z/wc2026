import Link from "next/link";
import { BrandMark } from "@/components/Logo";

// Shared site footer (brand + legal nav + disclaimer). Used by the public shell
// and inside the authenticated app. Arabic-first to match the rest of the chrome.
const FOOTER_NAV = [
  { href: "/", label: "الرئيسية" },
  { href: "/rules", label: "القواعد" },
  { href: "/faq", label: "الأسئلة الشائعة" },
  { href: "/privacy", label: "الخصوصية" },
  { href: "/terms", label: "الشروط" },
  { href: "/contact", label: "تواصل معنا" },
];

export function SiteFooter({ className = "" }: { className?: string }) {
  return (
    <footer className={`mt-12 border-t border-white/15 bg-navy-950 ${className}`}>
      <div className="h-[3px] w-full bg-gradient-to-l from-accent-500 via-[#7c5cff] to-lime-500" />
      <div className="mx-auto max-w-5xl px-4 pt-10 pb-20 text-slate-300">
        <Link href="/" className="mb-5 flex items-center gap-2.5">
          <BrandMark className="h-9 w-9" />
          <span className="font-display text-lg font-extrabold text-white">توقعات كأس 2026</span>
        </Link>
        <nav className="mb-6 flex flex-wrap gap-x-6 gap-y-3 text-base font-semibold">
          {FOOTER_NAV.map((l) => (
            <Link key={l.href} href={l.href} className="text-slate-200 transition hover:text-accent-400">
              {l.label}
            </Link>
          ))}
        </nav>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
          هذا الموقع لعبة توقعات للترفيه والمنافسة بين الأصدقاء، وغير مرتبط رسميًا بالاتحاد الدولي لكرة القدم
          (FIFA). جميع العلامات التجارية تعود لأصحابها.
        </p>
        <p className="mt-4 text-sm font-semibold text-slate-400">© 2026 توقعات كأس 2026</p>
      </div>
    </footer>
  );
}
