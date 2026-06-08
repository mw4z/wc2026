import { prisma } from "./prisma";

const REGISTRATION_OPEN = "registration_open";

export async function isRegistrationOpen(): Promise<boolean> {
  const row = await prisma.setting.findUnique({ where: { key: REGISTRATION_OPEN } });
  // Default to open if never configured.
  return row ? row.value === "true" : true;
}

export async function setRegistrationOpen(open: boolean): Promise<void> {
  await prisma.setting.upsert({
    where: { key: REGISTRATION_OPEN },
    update: { value: String(open) },
    create: { key: REGISTRATION_OPEN, value: String(open) },
  });
}
