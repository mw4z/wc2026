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
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/15 bg-navy-950 shadow-[0_-8px_24px_rgba(0,0,0,0.5)] xl:hidden">
      <div className="h-[3px] w-full bg-gradient-to-l from-accent-500 via-[#7c5cff] to-lime-500" />
      <div className="flex items-stretch justify-around pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1.5">
        {items.map(({ href, label, Icon }) => {
          const on = active(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-bold transition ${
                on ? "text-accent-400" : "text-slate-300"
              }`}
            >
              <Icon className={`text-2xl ${on ? "drop-shadow-[0_0_8px_rgba(56,128,255,0.5)]" : ""}`} />
              <span className="max-w-full truncate px-0.5">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
