"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUI } from "./I18nProvider";
import { navItems } from "./navItems";

// Mobile bottom tab bar. Rendered OUTSIDE the backdrop-blurred header so its
// `fixed` positioning anchors to the viewport (backdrop-filter on an ancestor
// would otherwise make it a containing block and pin this to the header).
export function MobileTabBar({ isAdmin }: { isAdmin: boolean }) {
  const UI = useUI();
  const path = usePathname();
  const active = (href: string) => path === href || path.startsWith(href + "/");
  const items = navItems(UI, isAdmin);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-navy-950/95 backdrop-blur-xl xl:hidden">
      <div className="h-[2px] w-full bg-gradient-to-l from-accent-500 via-[#7c5cff] to-lime-500" />
      <div className="flex items-stretch justify-around pb-[env(safe-area-inset-bottom)]">
        {items.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold transition ${
              active(href) ? "text-accent-400" : "text-slate-400"
            }`}
          >
            <Icon className="text-xl" />
            <span className="max-w-full truncate px-0.5">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
