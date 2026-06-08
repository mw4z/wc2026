import { prisma } from "./prisma";
import { isRegistrationOpen } from "./settings";
import { normalizePhone } from "./phone";
import type { LoginInput, PhoneLoginInput } from "./validation";

export class LoginError extends Error {
  constructor(message: string, public code: string, public status = 400) {
    super(message);
  }
}

// LEGACY: employee-id bootstrap admins (kept for transition).
function adminIds(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMPLOYEE_IDS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

// Phone-based bootstrap admins (E.164), comma-separated in ADMIN_PHONE_NUMBERS.
function adminPhones(): Set<string> {
  return new Set(
    (process.env.ADMIN_PHONE_NUMBERS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

/**
 * Phone login. phoneE164 is the unique identity.
 *  - Existing phone → log into that account; display name is NEVER overwritten.
 *  - New phone → create the user (if registration is open). No password, no OTP yet.
 *  - Deactivated user → rejected.
 * Bootstrap admins (ADMIN_PHONE_NUMBERS) are promoted to ADMIN on login.
 */
export async function loginOrRegisterByPhone(input: PhoneLoginInput) {
  const phoneE164 = normalizePhone(input.phone, input.country);
  if (!phoneE164) {
    throw new LoginError("رقم الجوال غير صحيح", "INVALID_PHONE", 422);
  }
  const isBootstrapAdmin = adminPhones().has(phoneE164);

  const existing = await prisma.user.findUnique({ where: { phoneE164 } });
  if (existing) {
    if (!existing.isActive) {
      throw new LoginError("تم إيقاف هذا الحساب. تواصل مع الإدارة.", "USER_INACTIVE", 403);
    }
    if (isBootstrapAdmin && existing.role !== "ADMIN") {
      return prisma.user.update({ where: { id: existing.id }, data: { role: "ADMIN" } });
    }
    return existing;
  }

  if (!isBootstrapAdmin && !(await isRegistrationOpen())) {
    throw new LoginError("تم إغلاق تسجيل المشاركين الجدد.", "REGISTRATION_CLOSED", 403);
  }

  return prisma.user.create({
    data: {
      phoneE164,
      name: input.name.trim(),
      role: isBootstrapAdmin ? "ADMIN" : "USER",
    },
  });
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
