import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getUI } from "@/lib/locale";
import { BrandMark } from "@/components/Logo";
import { AutoJoin } from "@/components/groups/AutoJoin";

export const dynamic = "force-dynamic";

// Invite link target: /join/CUP-12345. If logged in, AutoJoin joins immediately
// and redirects to the group. If not, send through login carrying the code in
// `next` so the user lands back here and auto-joins after authenticating.
export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const user = await getCurrentUser();
  if (!user || !user.isActive) {
    redirect(`/login?next=${encodeURIComponent(`/join/${code}`)}`);
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
