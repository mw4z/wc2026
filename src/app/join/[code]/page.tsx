import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getUI } from "@/lib/locale";
import { BrandMark } from "@/components/Logo";
import { AutoJoin } from "@/components/groups/AutoJoin";

export const dynamic = "force-dynamic";

// Invite link target: /join/CUP-12345. If logged in, AutoJoin joins immediately
// and redirects to the group. Logged-out visitors never reach this render — the
// middleware stashes the code in the wc26_invite cookie and redirects them to
// /login (a server component can't set cookies). After signup they land on
// /matches with the code pre-filled. This redirect is just a safety net.
export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const user = await getCurrentUser();
  if (!user || !user.isActive) {
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
