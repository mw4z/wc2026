import { prisma } from "./prisma";
import { isRegistrationOpen } from "./settings";
import type { LoginInput } from "./validation";

export class LoginError extends Error {
  constructor(message: string, public code: string, public status = 400) {
    super(message);
  }
}

function adminIds(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMPLOYEE_IDS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

/**
 * Low-friction login. employeeId (the employee number) is the unique identity.
 *
 *  - Existing employeeId  → log into that account. The stored name is NEVER
 *    overwritten by what was typed at login (display name is admin-controlled).
 *  - New employeeId       → create the user (if registration is open), then log
 *    in immediately. No password, no email verification.
 *  - Deactivated user     → rejected.
 *
 * Bootstrap admins (ADMIN_EMPLOYEE_IDS) are promoted to ADMIN on login.
 */
export async function loginOrRegister(input: LoginInput) {
  const employeeId = input.employeeId.trim();
  const isBootstrapAdmin = adminIds().has(employeeId);

  const existing = await prisma.user.findUnique({ where: { employeeId } });

  if (existing) {
    if (!existing.isActive) {
      throw new LoginError("تم إيقاف هذا الحساب. تواصل مع الإدارة.", "USER_INACTIVE", 403);
    }
    // Promote bootstrap admins if needed; do NOT touch the name.
    if (isBootstrapAdmin && existing.role !== "ADMIN") {
      return prisma.user.update({ where: { id: existing.id }, data: { role: "ADMIN" } });
    }
    return existing;
  }

  // New user → only if registration is still open (admins close it at kickoff).
  if (!isBootstrapAdmin && !(await isRegistrationOpen())) {
    throw new LoginError("تم إغلاق تسجيل المشاركين الجدد.", "REGISTRATION_CLOSED", 403);
  }

  return prisma.user.create({
    data: {
      employeeId,
      name: input.name.trim(),
      department: input.department?.trim() || null,
      role: isBootstrapAdmin ? "ADMIN" : "USER",
    },
  });
}
