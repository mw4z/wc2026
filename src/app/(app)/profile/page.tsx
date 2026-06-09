import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUI } from "@/lib/locale";
import { TournamentHero, HeroStat } from "@/components/TournamentHero";
import { UserIcon, ShieldIcon } from "@/components/icons";
import { EmailManager } from "@/components/EmailManager";
import { DeleteAccountButton } from "@/components/DeleteAccountButton";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const UI = await getUI();
  const user = await requireUser();
  const entry = await prisma.leaderboardEntry.findUnique({ where: { userId: user.id } });

  const stat = (label: string, value: string | number) => (
    <div className="card card-accent p-4 text-center">
      <div className="text-2xl font-extrabold text-gold-400">{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl">
      <TournamentHero
        title={user.name}
        subtitle={user.role === "ADMIN" ? UI.profileAdminSubtitle : UI.profileUserSubtitle}
        icon={user.role === "ADMIN" ? <ShieldIcon /> : <UserIcon />}
      >
        <HeroStat label={UI.rank} value={entry?.rank ? `#${entry.rank}` : "—"} />
        <HeroStat label={UI.point} value={entry?.totalPoints ?? 0} />
        <HeroStat label={UI.statPredictions} value={entry?.totalPredictions ?? 0} />
      </TournamentHero>

      <div className="card mb-6 p-5">
        <Row label={UI.name} value={user.name} />
        <Row label={UI.department} value={user.department ?? "—"} />
        <Row label={UI.roleLabel} value={user.role === "ADMIN" ? UI.roleAdmin : UI.roleUser} />
      </div>

      <EmailManager current={user.email} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stat(UI.rank, entry?.rank ?? "—")}
        {stat(UI.totalPoints, entry?.totalPoints ?? 0)}
        {stat(UI.statExact, entry?.exactScores ?? 0)}
        {stat(UI.statPredictions, entry?.totalPredictions ?? 0)}
      </div>

      <p className="mt-6 text-center text-xs text-slate-500">{UI.changeNameNote}</p>

      <DeleteAccountButton />
    </div>
  );
}

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-navy-800 py-2 last:border-0">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="font-semibold">
        {value}
        {hint && <span className="mr-2 text-xs text-slate-500">({hint})</span>}
      </span>
    </div>
  );
}
