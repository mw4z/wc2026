import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isRegistrationOpen, getPredictionLead } from "@/lib/settings";
import { getUI } from "@/lib/locale";
import { AdminControls } from "@/components/admin/AdminControls";

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

      <div className="mb-6 flex flex-wrap gap-2">
        <Link href="/admin/matches" className="btn-ghost">{UI.admin.manageMatches}</Link>
        <Link href="/admin/predictions" className="btn-ghost">{UI.admin.viewPredictions}</Link>
        <Link href="/admin/groups" className="btn-ghost">{UI.admin.manageGroups}</Link>
        <Link href="/admin/users" className="btn-ghost">{UI.admin.manageUsers}</Link>
        <a href="/api/admin/export?type=leaderboard" className="btn-ghost">{UI.admin.exportLeaderboard}</a>
        <a href="/api/admin/export?type=predictions" className="btn-ghost">{UI.admin.exportPredictions}</a>
      </div>

      <AdminControls registrationOpen={registrationOpen} predictionLead={predictionLead} />
    </div>
  );
}
