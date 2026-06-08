import { PrismaClient } from "@prisma/client";
import { TEAMS, flagUrlForIso } from "./seed-data";

const prisma = new PrismaClient();

async function main() {
  // Teams (idempotent upsert by code).
  for (const t of TEAMS) {
    const flagUrl = flagUrlForIso(t.iso);
    await prisma.team.upsert({
      where: { code: t.code },
      update: { nameEn: t.nameEn, nameAr: t.nameAr, groupName: t.group, flagUrl },
      create: { code: t.code, nameEn: t.nameEn, nameAr: t.nameAr, groupName: t.group, flagUrl },
    });
  }

  // A "TBD" placeholder team so knockout / undecided matches can be imported.
  await prisma.team.upsert({
    where: { code: "TBD" },
    update: {},
    create: { code: "TBD", nameEn: "TBD", nameAr: "يُحدد لاحقًا" },
  });

  // Bootstrap admin (also auto-granted via ADMIN_EMPLOYEE_IDS on login).
  await prisma.user.upsert({
    where: { employeeId: "1001" },
    update: { role: "ADMIN" },
    create: { employeeId: "1001", name: "مدير النظام", role: "ADMIN", department: "تقنية المعلومات" },
  });

  // Default setting so the Setting table is populated (registration open by default).
  await prisma.setting.upsert({
    where: { key: "registration_open" },
    update: {},
    create: { key: "registration_open", value: "true" },
  });

  console.log(`Seeded ${TEAMS.length} teams + TBD + admin (employeeId 1001) + default settings.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
