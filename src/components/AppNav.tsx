"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUI } from "./I18nProvider";
import { BallIcon, UsersIcon, TrophyIcon, ListIcon, UserIcon, ShieldIcon } from "./icons";

// Desktop: inline nav in the header. Mobile: a fixed bottom tab bar (no
// horizontal scrolling). Both are driven by the same item list.
export function AppNav({ isAdmin }: { isAdmin: boolean }) {
  const UI = useUI();
  const path = usePathname();
  const active = (href: string) => path === href || path.startsWith(href + "/");

  const items = [
    { href: "/matches", label: UI.matches, Icon: BallIcon },
    { href: "/groups", label: UI.groups, Icon: UsersIcon },
    { href: "/leaderboard", label: UI.leaderboard, Icon: TrophyIcon },
    { href: "/rules", label: UI.rules, Icon: ListIcon },
    { href: "/profile", label: UI.profile, Icon: UserIcon },
  ];
  if (isAdmin) items.push({ href: "/admin", label: UI.adminPanel, Icon: ShieldIcon });

  return (
    <>
      {/* Desktop / tablet — inline */}
      <nav className="hidden items-center gap-0.5 md:flex">
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

      {/* Mobile — fixed bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-navy-950/95 backdrop-blur-xl md:hidden">
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
    </>
  );
}
