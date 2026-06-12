import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeGroupCode } from "@/lib/groups";
import { getUI } from "@/lib/locale";
import { SITE_URL } from "@/lib/site";
import { BrandMark } from "@/components/Logo";
import { AutoJoin } from "@/components/groups/AutoJoin";

export const dynamic = "force-dynamic";

// Public invite metadata — rich preview for WhatsApp/X. No login, no private data
// (only the group name + code + public join URL). Falls back generically.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const normalized = normalizeGroupCode(code);
  const display = normalized ?? code;
  let groupName: string | null = null;
  if (normalized) {
    const grp = await prisma.group.findUnique({
      where: { code: normalized },
      select: { name: true, isActive: true },
    });
    if (grp?.isActive) groupName = grp.name;
  }

  const title = groupName
    ? `انضم لمجموعة ${groupName} في GamePredict`
    : "انضم لمجموعة توقعات كأس 2026";
  const description = groupName
    ? `نافس أعضاء المجموعة في توقعات مباريات كأس 2026. كود المجموعة: ${display}`
    : `ادخل كود المجموعة ${display} ونافس أصحابك في توقعات المباريات.`;
  const url = `${SITE_URL}/join/${display}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, images: [{ url: "/og-join.png", width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description, images: ["/og-join.png"] },
  };
}

// Invite link target: /join/CUP-12345.
//  - Logged-in member → AutoJoin joins immediately and redirects to the group.
//  - Logged-out humans are handled by middleware (stash invite cookie → /login).
//  - Logged-out crawlers (WhatsApp/X) are let through by middleware so this
//    renders a public invite landing with the right OG metadata above.
export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const UI = await getUI();
  const user = await getCurrentUser();

  if (user && user.isActive) {
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

  // Public landing (crawlers / not signed in).
  const normalized = normalizeGroupCode(code);
  const display = normalized ?? code;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 text-center">
      <BrandMark className="mx-auto mb-4 h-16 w-16" />
      <h1 className="text-2xl font-extrabold">{UI.joinGroup}</h1>
      <p className="mt-2 text-sm text-slate-400">{UI.gpage.inviteHint}</p>
      <div className="mx-auto mt-4 inline-flex rounded-xl border border-gold-500/40 bg-gold-500/10 px-5 py-2 font-mono text-2xl font-bold tracking-[0.3em] text-gold-300">
        {display}
      </div>
      <Link href={`/login?next=${encodeURIComponent(`/join/${display}`)}`} className="btn-primary mt-6 inline-flex">
        {UI.login}
      </Link>
    </main>
  );
}
