import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { GroupNudge } from "@/components/GroupNudge";
import { InstallTracker } from "@/components/InstallTracker";
import { SoundUnlocker } from "@/components/SoundUnlocker";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user || !user.isActive) redirect("/login");

  const groupCount = await prisma.groupMember.count({ where: { userId: user.id } });

  return (
    <>
      <AppShell isAdmin={user.role === "ADMIN"}>{children}</AppShell>
      <GroupNudge hasGroup={groupCount > 0} />
      <InstallTracker />
      <SoundUnlocker />
    </>
  );
}
