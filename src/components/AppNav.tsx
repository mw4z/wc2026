"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUI } from "./I18nProvider";
import { navItems } from "./navItems";

// Desktop / tablet inline nav (md+). The mobile equivalent is MobileTabBar,
// rendered OUTSIDE the backdrop-blurred header so its fixed positioning anchors
// to the viewport.
export function AppNav({ isAdmin }: { isAdmin: boolean }) {
  const UI = useUI();
  const path = usePathname();
  const active = (href: string) => path === href || path.startsWith(href + "/");
  const items = navItems(UI, isAdmin);

  return (
    <nav className="no-scrollbar hidden items-center gap-0.5 overflow-x-auto lg:flex">
      {items.map(({ href, label, Icon }) => (
        <Link
          key={href}
          href={href}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold whitespace-nowrap transition ${
            active(href) ? "bg-accent-500/15 text-accent-400" : "text-slate-300 hover:bg-white/5 hover:text-white"
          }`}
        >
          <Icon className="text-base" />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
