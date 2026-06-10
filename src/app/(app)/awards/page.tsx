import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getActiveAwards, getMyAwardPredictions, isAwardsLocked, getAwardsLockAt, userCanUseAwards } from "@/lib/awards";
import { getUI, getLocale } from "@/lib/locale";
import { formatDateTimeAr } from "@/lib/time";
import { TournamentHero } from "@/components/TournamentHero";
import { TrophyIcon } from "@/components/icons";
import { AwardsList } from "@/components/AwardsList";

export const dynamic = "force-dynamic";

export default async function AwardsPage() {
  const UI = await getUI();
  const locale = await getLocale();
  const user = await requireUser();

  if (!(await userCanUseAwards(user.id))) {
    return (
      <div>
        <TournamentHero title={UI.awardsTitle} subtitle={UI.awardsSubtitle} icon={<TrophyIcon />} />
        <p className="card p-6 text-center text-sm text-slate-400">{UI.awardsNotEnabled}</p>
      </div>
    );
  }

  const [awards, mine, locked, lockAt] = await Promise.all([
    getActiveAwards(),
    getMyAwardPredictions(user.id),
    isAwardsLocked(),
    getAwardsLockAt(),
  ]);

  const data = awards.map((a) => {
    const pred = mine.get(a.id);
    return {
      id: a.id,
      name: locale === "en" ? a.nameEn : a.nameAr,
      winnerCandidateId: a.winnerCandidateId,
      myCandidateId: pred?.candidateId ?? null,
      points: pred?.pointsAwarded ?? null,
      candidates: a.candidates.map((c) => ({ id: c.id, name: locale === "en" ? c.nameEn : c.nameAr, team: c.team })),
    };
  });

  return (
    <div>
      <TournamentHero title={UI.awardsTitle} subtitle={UI.awardsSubtitle} icon={<TrophyIcon />} />
      <p className="mb-4 rounded-lg border border-accent-500/20 bg-accent-500/[0.06] px-4 py-2 text-center text-xs text-accent-200">
        {UI.awardsSeparateNote}
        {lockAt && !locked && <> · {UI.awardsLockAt.replace("{t}", formatDateTimeAr(lockAt))}</>}
      </p>
      {locked && (
        <p className="mb-4 rounded-lg border border-warn/30 bg-warn/10 px-4 py-2 text-center text-sm text-amber-200">
          {UI.awardsLockedNotice}
        </p>
      )}
      <AwardsList awards={data} locked={locked} />
      <p className="mt-4 text-center text-sm">
        <Link href="/groups" className="text-accent-400 hover:underline">{UI.awardsBoard} ←</Link>
      </p>
    </div>
  );
}
