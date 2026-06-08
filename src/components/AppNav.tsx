"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UI } from "@/lib/constants";
import { BallIcon, UsersIcon, TrophyIcon, ListIcon, UserIcon, ShieldIcon } from "./icons";

const ITEMS = [
  { href: "/matches", label: UI.matches, Icon: BallIcon },
  { href: "/groups", label: UI.groups, Icon: UsersIcon },
  { href: "/leaderboard", label: UI.leaderboard, Icon: TrophyIcon },
  { href: "/rules", label: UI.rules, Icon: ListIcon },
  { href: "/profile", label: UI.profile, Icon: UserIcon },
];

export function AppNav({ isAdmin }: { isAdmin: boolean }) {
  const path = usePathname();
  const active = (href: string) => path === href || path.startsWith(href + "/");

  const cls = (on: boolean) =>
    `inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold whitespace-nowrap transition ${
      on ? "bg-accent-500/15 text-accent-400" : "text-slate-300 hover:bg-white/5 hover:text-white"
    }`;

  return (
    <nav className="flex items-center gap-0.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {ITEMS.map(({ href, label, Icon }) => (
        <Link key={href} href={href} className={cls(active(href))}>
          <Icon className="text-base" />
          <span>{label}</span>
        </Link>
      ))}
      {isAdmin && (
        <Link href="/admin" className={cls(active("/admin"))}>
          <ShieldIcon className="text-base" />
          <span>{UI.adminPanel}</span>
        </Link>
      )}
    </nav>
  );
}
