import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { lockDueMatches } from "@/lib/matches";
import { isSameDayInTz } from "@/lib/time";
import { UI } from "@/lib/constants";
import { MatchCard } from "@/components/MatchCard";

export const dynamic = "force-dynamic";

export default async function MatchesPage() {
  const user = await requireUser();
  await lockDueMatches(); // keep status badges accurate on load

  const [matches, myPredictions] = await Promise.all([
    prisma.match.findMany({
      include: { homeTeam: true, awayTeam: true },
      orderBy: { kickoffAt: "asc" },
    }),
    prisma.prediction.findMany({ where: { userId: user.id } }),
  ]);

  const predByMatch = new Map(myPredictions.map((p) => [p.matchId, p]));
  const now = new Date();

  const today = matches.filter((m) => isSameDayInTz(m.kickoffAt, now));
  const upcoming = matches.filter(
    (m) => m.kickoffAt > now && !isSameDayInTz(m.kickoffAt, now),
  );
  const finished = matches.filter(
    (m) => m.kickoffAt <= now && !isSameDayInTz(m.kickoffAt, now),
  );

  const section = (title: string, list: typeof matches) =>
    list.length > 0 && (
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-bold text-gold-400">{title}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {list.map((m) => (
            <MatchCard
              key={m.id}
              match={serializeMatch(m)}
              prediction={serializePrediction(predByMatch.get(m.id))}
            />
          ))}
        </div>
      </section>
    );

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold">{UI.matches}</h1>
      {matches.length === 0 && (
        <p className="card p-6 text-center text-slate-400">لا توجد مباريات بعد.</p>
      )}
      {section(UI.todayMatches, today)}
      {section(UI.upcomingMatches, upcoming)}
      {section(UI.finishedMatches, finished)}
    </div>
  );
}

type MatchWithTeams = Prisma.MatchGetPayload<{ include: { homeTeam: true; awayTeam: true } }>;

// Serialize for the client component (Dates → ISO strings).
function serializeMatch(m: MatchWithTeams) {
  return {
    id: m.id,
    matchNumber: m.matchNumber,
    stage: m.stage,
    status: m.status,
    kickoffAt: m.kickoffAt.toISOString(),
    city: m.city,
    stadium: m.stadium,
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    homeTeam: m.homeTeam
      ? { id: m.homeTeam.id, nameAr: m.homeTeam.nameAr, code: m.homeTeam.code, flagUrl: m.homeTeam.flagUrl }
      : null,
    awayTeam: m.awayTeam
      ? { id: m.awayTeam.id, nameAr: m.awayTeam.nameAr, code: m.awayTeam.code, flagUrl: m.awayTeam.flagUrl }
      : null,
  };
}
function serializePrediction(p?: { predictedHomeScore: number; predictedAwayScore: number; predictedWinnerTeamId: string | null; pointsAwarded: number | null }) {
  if (!p) return null;
  return {
    predictedHomeScore: p.predictedHomeScore,
    predictedAwayScore: p.predictedAwayScore,
    predictedWinnerTeamId: p.predictedWinnerTeamId,
    pointsAwarded: p.pointsAwarded,
  };
}
export type SerializedMatch = ReturnType<typeof serializeMatch>;
export type SerializedPrediction = ReturnType<typeof serializePrediction>;
