import type { ComponentType, SVGProps } from "react";
import type { getDictionary } from "@/lib/i18n";
import { BallIcon, UsersIcon, TrophyIcon, ListIcon, UserIcon, ShieldIcon } from "./icons";

type Dict = ReturnType<typeof getDictionary>;
type IconType = ComponentType<SVGProps<SVGSVGElement>>;
export interface NavItem {
  href: string;
  label: string;
  Icon: IconType;
}

// Single source of truth for the main nav, shared by the desktop header nav and
// the mobile bottom tab bar.
export function navItems(UI: Dict, isAdmin: boolean): NavItem[] {
  const items: NavItem[] = [
    { href: "/matches", label: UI.matches, Icon: BallIcon },
    { href: "/groups", label: UI.groups, Icon: UsersIcon },
    { href: "/leaderboard", label: UI.navLeaderboard, Icon: TrophyIcon },
    { href: "/rules", label: UI.rules, Icon: ListIcon },
    { href: "/profile", label: UI.profile, Icon: UserIcon },
  ];
  if (isAdmin) items.push({ href: "/admin", label: UI.navAdmin, Icon: ShieldIcon });
  return items;
}
