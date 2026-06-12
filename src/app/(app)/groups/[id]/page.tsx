import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGroupForMember, getGroupLeaderboard, GroupError } from "@/lib/groups";
import { lockDueMatches } from "@/lib/matches";
import { getPredictionLead, predictionOpensAt } from "@/lib/settings";
import { isSameDayInTz, formatDateTimeAr } from "@/lib/time";
import { flagEmoji } from "@/lib/flags";
import { isCustomScoring } from "@/lib/groupScoring";
import { getUI, getLocale } from "@/lib/locale";
import { TournamentHero, HeroStat } from "@/components/TournamentHero";
import { UsersIcon, TrophyIcon, ListIcon } from "@/components/icons";
import { GroupTodayCard } from "@/components/groups/GroupTodayCard";
import { GroupInviteCard } from "@/components/groups/GroupInviteCard";
import { GroupReminderCard } from "@/components/groups/GroupReminderCard";
import { ShareLeaderboard } from "@/components/groups/ShareLeaderboard";
import { GroupShareButtons } from "@/components/groups/GroupShareButtons";
import { LeaderSettings } from "@/components/groups/LeaderSettings";
import { LeaveGroupButton } from "@/components/groups/LeaveGroupButton";
import { AdSlot } from "@/components/AdSlot";
import { AD_SLOTS } from "@/lib/ads";

export const dynamic = "force-dynamic";

export default async function GroupDashboard({ params }: { params: Promise<{ id: string }> }) {
  const UI = await getUI();
  const g = UI.gpage;
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

  await lockDueMatches();
  const now = new Date();
  const lead = await getPredictionLead();

  const [board, myPreds, matches, customMatchCount] = await Promise.all([
    getGroupLeaderboard(id),
    prisma.prediction.findMany({ where: { userId: user.id }, select: { matchId: true } }),
    prisma.match.findMany({
      where: { homeTeamId: { not: null }, awayTeamId: { not: null } },
      include: { homeTeam: true, awayTeam: true },
      orderBy: { kickoffAt: "asc" },
    }),
    prisma.groupMatchRule.count({ where: { groupId: id } }),
  ]);

  const myRow = board.find((r) => r.userId === user.id);
  const isLeader = group.leaderId === user.id;
  const tn = (t: { nameAr: string; nameEn: string } | null) =>
    t ? (locale === "en" ? t.nameEn : t.nameAr) : UI.tbd;

  // OPEN = scheduled, window started, kickoff ahead.
  const predicted = new Set(myPreds.map((m) => m.matchId));
  const openNow = (m: (typeof matches)[number]) => {
    if (m.status !== "SCHEDULED" || m.kickoffAt <= now) return false;
    const o = predictionOpensAt(m.kickoffAt, lead);
    return !o || o.getTime() <= now.getTime();
  };

  // Today card data.
  const todayAll = matches.filter((m) => isSameDayInTz(m.kickoffAt, now));
  const todayOpen = todayAll.filter(openNow);
  const todayMissing = todayOpen.filter((m) => !predicted.has(m.id)).length;
  const nextLockAt = todayOpen.length
    ? new Date(Math.min(...todayOpen.map((m) => m.kickoffAt.getTime()))).toISOString()
    : null;

  // Leader reminder: open matches (today first via kickoff order), up to 10.
  const reminderMatches = isLeader
    ? matches
        .filter(openNow)
        .slice(0, 10)
        .map((m) => {
          // Lead with an RTL mark (U+200F) so a line starting with a flag emoji
          // (which is LTR) keeps RTL order — otherwise WhatsApp flips home/away.
          const matchText = `‏${flagEmoji(m.homeTeam?.code)} ${tn(m.homeTeam)} × ${tn(m.awayTeam)} ${flagEmoji(m.awayTeam?.code)}`;
          const time = formatDateTimeAr(m.kickoffAt);
          return { id: m.id, label: `${matchText} — ${time}`, matchText, time, url: `/matches/${m.id}` };
        })
    : [];

  // Plain-language scoring summary shown to all members.
  const cfg = {
    pointsExact: group.pointsExact,
    pointsOutcome: group.pointsOutcome,
    pointsQualifier: group.pointsQualifier,
    winnerOnly: group.winnerOnly,
  };
  const p = UI.gscore.pointShort;
  let scoringSummary: string | null = null;
  if (group.winnerOnly) {
    scoringSummary = `${UI.gscore.winnerOnlyNotice} (${cfg.pointsOutcome} ${p})`;
  } else if (isCustomScoring(cfg)) {
    scoringSummary = `${UI.gscore.exactLabel} ${cfg.pointsExact} ${p} · ${UI.gscore.outcomeLabel} ${cfg.pointsOutcome} ${p} · ${UI.gscore.qualifierLabel} +${cfg.pointsQualifier}`;
  }
  if (scoringSummary && customMatchCount > 0) {
    scoringSummary += ` · ${customMatchCount} ${UI.gscore.perMatchCount}`;
  }

  const awardsEnabled = group.awardsEnabled;

  return (
    <div className="space-y-5">
      {/* 1) Summary */}
      <TournamentHero
        title={group.name}
        subtitle={isLeader ? `${UI.groupLeader} · ${UI.groupsSubtitle}` : UI.groupsSubtitle}
        icon={<UsersIcon />}
      >
        <HeroStat label={UI.members} value={board.length} />
        <HeroStat label={UI.groupRanking} value={myRow ? `#${myRow.rank}` : "—"} />
        <HeroStat label={g.myPoints} value={myRow?.totalPoints ?? 0} />
        <HeroStat label={UI.groupCode} value={group.code} />
      </TournamentHero>

      {/* 2) Today's prediction action */}
      <GroupTodayCard hasToday={todayAll.length > 0} missing={todayMissing} nextLockAt={nextLockAt} />

      {/* 3) Group ranking */}
      <section className="card p-5">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-lg font-bold text-gold-400">{g.rankingTitle}</h2>
          <span className="text-xs text-slate-500">{g.membersCount.replace("{n}", String(board.length))}</span>
        </div>
        <p className="mb-3 text-xs text-slate-400">{UI.leaderboardUpdatedTitle}</p>

        <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
          <table className="w-full text-right text-sm">
            <thead className="border-b border-white/10 text-xs text-slate-400">
              <tr>
                <th className="p-3">{UI.rank}</th>
                <th className="p-3">{UI.name}</th>
                <th className="p-3">{UI.colPoints}</th>
              </tr>
            </thead>
            <tbody>
              {board.map((r) => (
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

        {scoringSummary && (
          <p className="mt-3 text-center text-xs text-slate-400">
            <span className="font-semibold text-accent-400">{UI.gscore.summaryTitle}:</span> {scoringSummary}
          </p>
        )}

        {board.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <ShareLeaderboard groupName={group.name} code={group.code} rows={board} currentUserId={user.id} />
            <GroupShareButtons code={group.code} points={myRow?.totalPoints ?? 0} rank={myRow?.rank ?? null} />
          </div>
        )}
      </section>

      {/* Members' predictions — who predicted / who hasn't + revealed picks */}
      <section className="card flex items-center justify-between gap-3 p-5">
        <div className="min-w-0">
          <h2 className="font-bold text-gold-400">{g.predictionsTitle}</h2>
          <p className="text-sm text-slate-400">{g.predictionsDesc}</p>
        </div>
        <Link
          href={`/groups/${id}/predictions`}
          className="btn-ghost inline-flex shrink-0 items-center gap-1.5 text-sm"
        >
          <ListIcon className="text-base" />
          {g.viewPredictions}
        </Link>
      </section>

      <AdSlot slotId={AD_SLOTS.groupTop} slotName="group-top" />

      {/* 4) Invite */}
      <GroupInviteCard code={group.code} />

      {/* 5) Leader reminder — choose a specific match */}
      {isLeader && <GroupReminderCard matches={reminderMatches} code={group.code} />}

      {/* 6) Awards */}
      <section className="card p-5">
        <h2 className="mb-2 font-bold text-gold-400">{g.awardsTitle}</h2>
        {awardsEnabled ? (
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/awards" className="btn-primary inline-flex items-center gap-1.5 text-sm">
              <TrophyIcon className="text-base" />
              {g.awardsPredict}
            </Link>
            <Link href={`/groups/${id}/awards`} className="btn-ghost inline-flex items-center gap-1.5 text-sm">
              <TrophyIcon className="text-base" />
              {g.awardsBoard}
            </Link>
          </div>
        ) : (
          <p className="text-sm text-slate-500">{g.awardsDisabled}</p>
        )}
      </section>

      {/* 7) Members */}
      <section className="card flex items-center justify-between gap-3 p-5">
        <div>
          <h2 className="font-bold text-gold-400">{g.membersTitle}</h2>
          <p className="text-sm text-slate-400">{g.membersCount.replace("{n}", String(board.length))}</p>
        </div>
        <Link href={`/groups/${id}/members`} className="btn-ghost inline-flex items-center gap-1.5 text-sm">
          <UsersIcon className="text-base" />
          {g.viewMembers}
        </Link>
      </section>

      {/* Leader-only settings (collapsible, low priority) */}
      {isLeader && <LeaderSettings groupId={id} groupName={group.name} awardsEnabled={awardsEnabled} />}

      <LeaveGroupButton groupId={id} isLeader={isLeader} />
    </div>
  );
}
