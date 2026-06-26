import { requireUser } from "@/lib/auth";
import { getUI } from "@/lib/locale";
import { getTournamentData } from "@/lib/standings";
import { TournamentHero } from "@/components/TournamentHero";
import { TrophyIcon } from "@/components/icons";
import { TournamentView } from "@/components/TournamentView";
import { AdSlot } from "@/components/AdSlot";
import { AD_SLOTS } from "@/lib/ads";

export const dynamic = "force-dynamic";

export default async function TournamentPage() {
  const UI = await getUI();
  await requireUser();
  const data = await getTournamentData();

  return (
    <div>
      <TournamentHero title={UI.tournamentStandingsTitle} subtitle={UI.tournamentStandingsSubtitle} icon={<TrophyIcon />} />
      <AdSlot slotId={AD_SLOTS.leaderboardTop} slotName="tournament-top" />
      <TournamentView initial={data} />
    </div>
  );
}
