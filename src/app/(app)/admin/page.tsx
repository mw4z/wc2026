import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isRegistrationOpen } from "@/lib/settings";
import { UI } from "@/lib/constants";
import { AdminControls } from "@/components/admin/AdminControls";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  await requireAdmin();
  const [users, matches, scored, predictions, registrationOpen] = await Promise.all([
    prisma.user.count(),
    prisma.match.count(),
    prisma.match.count({ where: { status: "SCORED" } }),
    prisma.prediction.count(),
    isRegistrationOpen(),
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
        {stat("المشاركون", users)}
        {stat("المباريات", matches)}
        {stat("مباريات محتسبة", scored)}
        {stat("التوقعات", predictions)}
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <Link href="/admin/matches" className="btn-ghost">إدارة المباريات والنتائج</Link>
        <Link href="/admin/predictions" className="btn-ghost">عرض التوقعات</Link>
        <Link href="/admin/users" className="btn-ghost">إدارة المستخدمين</Link>
        <a href="/api/admin/export?type=leaderboard" className="btn-ghost">تصدير المتصدرين CSV</a>
        <a href="/api/admin/export?type=predictions" className="btn-ghost">تصدير التوقعات CSV</a>
      </div>

      <AdminControls registrationOpen={registrationOpen} />
    </div>
  );
}
