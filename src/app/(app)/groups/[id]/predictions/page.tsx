import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGroupForMember, getGroupMembers, GroupError } from "@/lib/groups";
import { lockDueMatches } from "@/lib/matches";
import { getUI, getLocale } from "@/lib/locale";
import { GroupPredictions } from "@/components/groups/GroupPredictions";

export const dynamic = "force-dynamic";

export default async function GroupPredictionsPage({ params }: { params: Promise<{ id: string }> }) {
  const UI = await getUI();
  const locale = await getLocale();
  const user = await requireUser();
  const { id } = await params;
  const isAdmin = user.role === "ADMIN";

  let group;
  try {
    ({ group } = await getGroupForMember(user.id, id, isAdmin)); // membership check
  } catch (e) {
    const msg = e instanceof GroupError ? e.message : UI.groupNotFound;
    return <p className="card p-6 text-center text-amber-200">{msg}</p>;
  }

  await lockDueMatches();
  const isLeader = group.leaderId === user.id;

  const memberRows = await getGroupMembers(id);
  const members = memberRows.map((m) => ({ id: m.user.id, name: m.user.name }));
  const memberIds = members.map((m) => m.id);

  const [matches, preds] = await Promise.all([
    prisma.match.findMany({
      where: { homeTeamId: { not: null }, awayTeamId: { not: null } },
      include: { homeTeam: true, awayTeam: true },
      orderBy: { kickoffAt: "asc" },
    }),
    prisma.prediction.findMany({ where: { userId: { in: memberIds } } }),
  ]);

  // Index predictions: matchId → (userId → prediction)
  const byMatch = new Map<string, Map<string, (typeof preds)[number]>>();
  for (const p of preds) {
    let m = byMatch.get(p.matchId);
    if (!m) byMatch.set(p.matchId, (m = new Map()));
    m.set(p.userId, p);
  }

  const now = Date.now();
  const tn = (t: { nameAr: string; nameEn: string } | null) => (t ? (locale === "en" ? t.nameEn : t.nameAr) : UI.tbd);

  const views = matches.map((m) => {
    // Mirror the server lock: predictions reveal only AFTER kickoff (anti-cheat).
    const locked = m.status !== "SCHEDULED" || m.kickoffAt.getTime() <= now;
    const pm = byMatch.get(m.id) ?? new Map();

    const base = {
      id: m.id,
      matchNumber: m.matchNumber,
      stage: m.stage as string,
      kickoffAt: m.kickoffAt.toISOString(),
      home: tn(m.homeTeam),
      away: tn(m.awayTeam),
      homeFlag: m.homeTeam?.flagUrl ?? null,
      awayFlag: m.awayTeam?.flagUrl ?? null,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      locked,
      predictedCount: pm.size,
      total: members.length,
    };

    if (locked) {
      // Reveal everyone's picks (frozen) + points.
      return {
        ...base,
        picks: members.map((mem) => {
          const p = pm.get(mem.id);
          return {
            name: mem.name,
            home: p ? p.predictedHomeScore : null,
            away: p ? p.predictedAwayScore : null,
            points: p?.pointsAwarded ?? null,
          };
        }),
        pending: null as string[] | null,
      };
    }
    // Upcoming: NEVER expose scores. Only who has / hasn't predicted.
    return {
      ...base,
      picks: null,
      pending: members.filter((mem) => !pm.has(mem.id)).map((mem) => mem.name),
    };
  });

  const upcoming = views.filter((v) => !v.locked); // already asc by kickoff
  const revealed = views.filter((v) => v.locked).reverse(); // most recent first

  return (
    <GroupPredictions
      groupId={id}
      groupName={group.name}
      groupCode={group.code}
      isLeader={isLeader}
      upcoming={upcoming}
      revealed={revealed}
    />
  );
}
