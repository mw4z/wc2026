import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGroupForMember, getGroupScoring, GroupError } from "@/lib/groups";
import { isKnockoutStage } from "@/lib/constants";
import { getUI, getLocale } from "@/lib/locale";
import { ArrowIcon } from "@/components/icons";
import { GroupScoringEditor } from "@/components/groups/GroupScoringEditor";

export const dynamic = "force-dynamic";

export default async function GroupScoringPage({ params }: { params: Promise<{ id: string }> }) {
  const UI = await getUI();
  const locale = await getLocale();
  const user = await requireUser();
  const { id } = await params;
  const isAdmin = user.role === "ADMIN";

  let group;
  try {
    ({ group } = await getGroupForMember(user.id, id, isAdmin));
  } catch (e) {
    const msg = e instanceof GroupError ? e.message : UI.groupNotFound;
    return <p className="card p-6 text-center text-amber-200">{msg}</p>;
  }

  // Leader-only screen (admins may view too).
  if (group.leaderId !== user.id && !isAdmin) {
    return (
      <div className="mx-auto max-w-lg">
        <BackLink label={UI.backToMatches} href={`/groups/${id}`} />
        <p className="card p-6 text-center text-amber-200">{UI.gscore.leaderOnly}</p>
      </div>
    );
  }

  const [scoring, matches] = await Promise.all([
    getGroupScoring(id),
    prisma.match.findMany({
      include: { homeTeam: true, awayTeam: true },
      orderBy: { matchNumber: "asc" },
    }),
  ]);

  const matchRows = matches.map((m) => ({
    id: m.id,
    label: `#${m.matchNumber} · ${UI.stages[m.stage]}`,
    home: m.homeTeam ? (locale === "en" ? m.homeTeam.nameEn : m.homeTeam.nameAr) : UI.tbd,
    away: m.awayTeam ? (locale === "en" ? m.awayTeam.nameEn : m.awayTeam.nameAr) : UI.tbd,
    isKnockout: isKnockoutStage(m.stage),
  }));

  return (
    <div className="mx-auto max-w-2xl">
      <BackLink label={group.name} href={`/groups/${id}`} />
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold text-white">{UI.gscore.title}</h1>
        <p className="mt-1 text-sm text-slate-400">{UI.gscore.subtitle}</p>
      </div>
      <GroupScoringEditor groupId={id} initial={scoring} matches={matchRows} />
    </div>
  );
}

function BackLink({ label, href }: { label: string; href: string }) {
  return (
    <Link
      href={href}
      className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-400 transition hover:text-accent-500"
    >
      <ArrowIcon className="text-base rtl:-scale-x-100" />
      {label}
    </Link>
  );
}
