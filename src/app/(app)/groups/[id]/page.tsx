import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGroupForMember, getGroupLeaderboard, GroupError } from "@/lib/groups";
import { getUI } from "@/lib/locale";
import { CopyCode } from "@/components/groups/CopyCode";
import { GroupShareButtons } from "@/components/groups/GroupShareButtons";
import { LeaveGroupButton } from "@/components/groups/LeaveGroupButton";
import { TournamentHero, HeroStat } from "@/components/TournamentHero";
import { UsersIcon, TrophyIcon, SlidersIcon } from "@/components/icons";
import { isCustomScoring } from "@/lib/groupScoring";
import { AdSlot } from "@/components/AdSlot";
import { AD_SLOTS } from "@/lib/ads";

export const dynamic = "force-dynamic";

export default async function GroupDashboard({ params }: { params: Promise<{ id: string }> }) {
  const UI = await getUI();
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

  const board = await getGroupLeaderboard(id);
  const myRow = board.find((r) => r.userId === user.id);
  const top5 = board.slice(0, 5);
  const isLeader = group.leaderId === user.id;

  // Plain-language scoring summary shown to all members.
  const cfg = {
    pointsExact: group.pointsExact,
    pointsOutcome: group.pointsOutcome,
    pointsQualifier: group.pointsQualifier,
    winnerOnly: group.winnerOnly,
  };
  const p = UI.gscore.pointShort;
  const customMatchCount = await prisma.groupMatchRule.count({ where: { groupId: id } });
  let scoringSummary: string | null = null;
  if (group.winnerOnly) {
    scoringSummary = `${UI.gscore.winnerOnlyNotice} (${cfg.pointsOutcome} ${p})`;
  } else if (isCustomScoring(cfg)) {
    scoringSummary = `${UI.gscore.exactLabel} ${cfg.pointsExact} ${p} · ${UI.gscore.outcomeLabel} ${cfg.pointsOutcome} ${p} · ${UI.gscore.qualifierLabel} +${cfg.pointsQualifier}`;
  }
  if (scoringSummary && customMatchCount > 0) {
    scoringSummary += ` · ${customMatchCount} ${UI.gscore.perMatchCount}`;
  }

  return (
    <div>
      <TournamentHero
        title={group.name}
        subtitle={isLeader ? `${UI.groupLeader} · ${UI.groupsSubtitle}` : UI.groupsSubtitle}
        icon={<UsersIcon />}
      >
        <HeroStat label={UI.members} value={board.length} />
        <HeroStat label={UI.groupRanking} value={myRow ? `#${myRow.rank}` : "—"} />
        <HeroStat label={UI.point} value={myRow?.totalPoints ?? 0} />
      </TournamentHero>

      <div className="card card-accent mb-6 p-5">
        {/* Prominent group code */}
        <div className="mb-4 flex flex-col items-center gap-2 text-center">
          <span className="rounded-xl border border-gold-500/40 bg-gold-500/10 px-5 py-2 font-mono text-2xl font-bold tracking-[0.3em] text-gold-300">
            {group.code}
          </span>
          <p className="text-xs text-slate-400">{UI.groupCodeShareHint}</p>
        </div>

        {/* Unified, uniform action grid */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          <CopyCode code={group.code} />
          <Link href={`/groups/${id}/leaderboard`} className="action-btn">
            <TrophyIcon className="ab-ic" />
            {UI.groupRanking}
          </Link>
          <Link href={`/groups/${id}/members`} className="action-btn">
            <UsersIcon className="ab-ic" />
            {UI.groupMembers}
          </Link>
          {isLeader && (
            <Link href={`/groups/${id}/scoring`} className="action-btn">
              <SlidersIcon className="ab-ic" />
              {UI.gscore.settingsBtn}
            </Link>
          )}
          <GroupShareButtons code={group.code} points={myRow?.totalPoints ?? 0} rank={myRow?.rank ?? null} />
        </div>

        {scoringSummary && (
          <p className="mt-4 border-t border-white/10 pt-4 text-center text-xs text-slate-400">
            <span className="font-semibold text-accent-400">{UI.gscore.summaryTitle}:</span> {scoringSummary}
          </p>
        )}

        <p className="mt-4 border-t border-white/10 pt-4 text-sm text-slate-300">
          <span className="font-semibold text-gold-300">{UI.leaderboardUpdatedTitle}</span> —{" "}
          <Link href={`/groups/${id}/leaderboard`} className="text-accent-400 hover:underline">
            {UI.seeYourRank}
          </Link>
        </p>
      </div>

      <AdSlot slotId={AD_SLOTS.groupTop} slotName="group-top" />

      <h2 className="mb-3 text-lg font-bold text-gold-400">{UI.topFive}</h2>
      <div className="card overflow-x-auto">
        <table className="w-full text-right text-sm">
          <thead className="border-b border-white/10 text-xs text-slate-400">
            <tr>
              <th className="p-3">{UI.rank}</th>
              <th className="p-3">{UI.name}</th>
              <th className="p-3">{UI.totalPoints}</th>
            </tr>
          </thead>
          <tbody>
            {top5.map((r) => (
              <tr key={r.userId} className={`border-b border-white/5 ${r.userId === user.id ? "bg-gold-500/15" : ""}`}>
                <td className="p-3">
                  <span className={`font-display font-bold tnum ${r.rank === 1 ? "text-gold-400" : "text-slate-300"}`}>
                    {r.rank}
                  </span>
                </td>
                <td className="p-3 font-semibold">{r.name}</td>
                <td className="p-3 font-extrabold text-gold-400">{r.totalPoints}</td>
              </tr>
            ))}
            {board.length === 0 && (
              <tr><td colSpan={3} className="p-6 text-center text-slate-500">{UI.noMembersYet}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <LeaveGroupButton groupId={id} isLeader={isLeader} />
    </div>
  );
}
