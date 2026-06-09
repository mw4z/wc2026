import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isRegistrationOpen, getPredictionLead } from "@/lib/settings";
import { getUI } from "@/lib/locale";
import { AdminControls } from "@/components/admin/AdminControls";
import { PushTestButton } from "@/components/admin/PushTestButton";
import { BallIcon, ListIcon, UsersIcon, UserIcon, DownloadIcon, ArrowIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const UI = await getUI();
  await requireAdmin();
  const [users, matches, scored, predictions, registrationOpen, predictionLead] = await Promise.all([
    prisma.user.count(),
    prisma.match.count(),
    prisma.match.count({ where: { status: "SCORED" } }),
    prisma.prediction.count(),
    isRegistrationOpen(),
    getPredictionLead(),
  ]);

  const stat = (label: string, value: number | string) => (
    <div className="card p-4 text-center">
      <div className="text-2xl font-extrabold text-gold-400">{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  );

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold">{UI.adminPanel}</h1>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stat(UI.admin.participants, users)}
        {stat(UI.matches, matches)}
        {stat(UI.admin.scoredMatches, scored)}
        {stat(UI.statPredictions, predictions)}
      </div>

      <div className="mb-6 grid gap-2.5 sm:grid-cols-2">
        <Link href="/admin/matches" className="tile">
          <span className="tile-ic"><BallIcon /></span>
          <span className="tile-label">{UI.admin.manageMatches}</span>
          <ArrowIcon className="tile-chev" />
        </Link>
        <Link href="/admin/predictions" className="tile">
          <span className="tile-ic"><ListIcon /></span>
          <span className="tile-label">{UI.admin.viewPredictions}</span>
          <ArrowIcon className="tile-chev" />
        </Link>
        <Link href="/admin/groups" className="tile">
          <span className="tile-ic"><UsersIcon /></span>
          <span className="tile-label">{UI.admin.manageGroups}</span>
          <ArrowIcon className="tile-chev" />
        </Link>
        <Link href="/admin/users" className="tile">
          <span className="tile-ic"><UserIcon /></span>
          <span className="tile-label">{UI.admin.manageUsers}</span>
          <ArrowIcon className="tile-chev" />
        </Link>
      </div>

      <div className="mb-6">
        <span className="eyebrow mb-2 block">{UI.admin.exportData}</span>
        <div className="grid gap-2.5 sm:grid-cols-2">
          <a href="/api/admin/export?type=leaderboard" className="tile">
            <span className="tile-ic"><DownloadIcon /></span>
            <span className="tile-label">{UI.admin.exportLeaderboard}</span>
          </a>
          <a href="/api/admin/export?type=predictions" className="tile">
            <span className="tile-ic"><DownloadIcon /></span>
            <span className="tile-label">{UI.admin.exportPredictions}</span>
          </a>
        </div>
      </div>

      <AdminControls registrationOpen={registrationOpen} predictionLead={predictionLead} />

      <div className="mt-6">
        <PushTestButton />
      </div>
    </div>
  );
}
