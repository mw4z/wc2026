import { requireAdmin } from "@/lib/auth";
import { adminListAwards, getAwardsLockAt } from "@/lib/awards";
import { getUI } from "@/lib/locale";
import { formatDateTimeAr } from "@/lib/time";
import { AdminAwards } from "@/components/admin/AdminAwards";

export const dynamic = "force-dynamic";

export default async function AdminAwardsPage() {
  const UI = await getUI();
  await requireAdmin();
  const [awards, lockAt] = await Promise.all([adminListAwards(), getAwardsLockAt()]);

  const data = awards.map((a) => ({
    id: a.id,
    nameAr: a.nameAr,
    nameEn: a.nameEn,
    winnerCandidateId: a.winnerCandidateId,
    candidates: a.candidates.map((c) => ({ id: c.id, nameAr: c.nameAr, nameEn: c.nameEn, team: c.team })),
  }));

  return (
    <div>
      <h1 className="mb-2 text-2xl font-extrabold">{UI.admin.manageAwards}</h1>
      <p className="mb-6 text-sm text-slate-400">
        {UI.awardsLockAt.replace("{t}", lockAt ? formatDateTimeAr(lockAt) : "—")}
      </p>
      <AdminAwards awards={data} />
    </div>
  );
}
