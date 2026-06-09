import { redirect } from "next/navigation";
import { getCurrentUser, createInvitePending } from "@/lib/auth";
import { getUI } from "@/lib/locale";
import { BrandMark } from "@/components/Logo";
import { AutoJoin } from "@/components/groups/AutoJoin";

export const dynamic = "force-dynamic";

// Invite link target: /join/CUP-12345. If logged in, AutoJoin joins immediately
// and redirects to the group. If not, stash the code in a short-lived invite
// cookie and send the user through login normally — after signing up they land
// on /matches and the signup form pre-fills the code (rather than auto-joining
// and dumping them on the group page).
export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const user = await getCurrentUser();
  if (!user || !user.isActive) {
    await createInvitePending(code);
    redirect("/login");
  }
  const UI = await getUI();

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5">
      <div className="mb-6 text-center">
        <BrandMark className="mx-auto mb-3 h-14 w-14" />
        <h1 className="text-xl font-extrabold">{UI.joinGroup}</h1>
      </div>
      <AutoJoin code={code} />
    </main>
  );
}
