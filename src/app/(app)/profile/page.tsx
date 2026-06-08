import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UI } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireUser();
  const entry = await prisma.leaderboardEntry.findUnique({ where: { userId: user.id } });

  const stat = (label: string, value: string | number) => (
    <div className="card p-4 text-center">
      <div className="text-2xl font-extrabold text-gold-400">{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-extrabold">{UI.profile}</h1>

      <div className="card mb-6 p-5">
        <Row label={UI.name} value={user.name} />
        <Row label={UI.phone} value={user.phoneE164 ?? user.employeeId ?? "—"} hint="لا يظهر للآخرين" />
        <Row label={UI.department} value={user.department ?? "—"} />
        <Row label="الصلاحية" value={user.role === "ADMIN" ? "مدير" : "مشارك"} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stat(UI.rank, entry?.rank ?? "—")}
        {stat(UI.totalPoints, entry?.totalPoints ?? 0)}
        {stat("نتائج دقيقة", entry?.exactScores ?? 0)}
        {stat("التوقعات", entry?.totalPredictions ?? 0)}
      </div>

      <p className="mt-6 text-center text-xs text-slate-500">
        لتغيير الاسم، يرجى التواصل مع إدارة المسابقة.
      </p>
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
