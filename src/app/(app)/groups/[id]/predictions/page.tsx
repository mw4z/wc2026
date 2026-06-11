import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGroupForMember, getGroupMembers, GroupError } from "@/lib/groups";
import { lockDueMatches } from "@/lib/matches";
import { getPredictionLead, predictionOpensAt } from "@/lib/settings";
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
  const lead = await getPredictionLead();
  const tn = (t: { nameAr: string; nameEn: string } | null) => (t ? (locale === "en" ? t.nameEn : t.nameAr) : UI.tbd);
  const label = (m: (typeof matches)[number]) => `${tn(m.homeTeam)} × ${tn(m.awayTeam)}`;

  const base = (m: (typeof matches)[number]) => ({
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
    total: members.length,
  });

  // OPEN = currently predictable: scheduled, teams known, kickoff ahead, and the
  // global prediction window has opened. LOCKED = kicked off / past SCHEDULED.
  const isOpen = (m: (typeof matches)[number]) => {
    if (m.status !== "SCHEDULED" || !m.homeTeamId || !m.awayTeamId) return false;
    if (m.kickoffAt.getTime() <= now) return false;
    const o = predictionOpensAt(m.kickoffAt, lead);
    return !o || o.getTime() <= now;
  };
  const isLocked = (m: (typeof matches)[number]) => m.status !== "SCHEDULED" || m.kickoffAt.getTime() <= now;

  const openMatches = matches.filter(isOpen);
  const lockedMatches = matches.filter(isLocked);

  // Upcoming = OPEN-to-predict matches only; show who has / hasn't predicted (no scores).
  const upcoming = openMatches.map((m) => {
    const pm = byMatch.get(m.id) ?? new Map();
    return {
      ...base(m),
      locked: false,
      predictedCount: pm.size,
      picks: null as null,
      pending: members.filter((mem) => !pm.has(mem.id)).map((mem) => mem.name),
    };
  });

  // Revealed = locked/finished matches; show everyone's frozen picks + points.
  const revealed = lockedMatches
    .map((m) => {
      const pm = byMatch.get(m.id) ?? new Map();
      return {
        ...base(m),
        locked: true,
        predictedCount: pm.size,
        pending: null as null,
        picks: members.map((mem) => {
          const p = pm.get(mem.id);
          return { name: mem.name, home: p ? p.predictedHomeScore : null, away: p ? p.predictedAwayScore : null, points: p?.pointsAwarded ?? null };
        }),
      };
    })
    .reverse();

  // Roster: per member, exactly WHICH open matches are still unpredicted.
  const roster = members
    .map((mem) => {
      const missingMatches = openMatches.filter((m) => !byMatch.get(m.id)?.has(mem.id)).map(label);
      return {
        name: mem.name,
        predicted: openMatches.length - missingMatches.length,
        total: openMatches.length,
        missing: missingMatches.length,
        missingMatches,
      };
    })
    .sort((a, b) => b.missing - a.missing);

  return (
    <GroupPredictions
      groupId={id}
      groupName={group.name}
      groupCode={group.code}
      isLeader={isLeader}
      winnerOnly={group.winnerOnly}
      upcoming={upcoming}
      revealed={revealed}
      roster={roster}
    />
  );
}
