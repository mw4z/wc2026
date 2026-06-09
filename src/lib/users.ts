import { prisma } from "./prisma";
import { isRegistrationOpen } from "./settings";
import { normalizePhone } from "./phone";
import { recalculateLeaderboard } from "./leaderboard";
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

  // Creating a new account requires a name (returning users sign in by phone only).
  const name = (input.name ?? "").trim();
  if (name.length < 2) {
    throw new LoginError("لا يوجد حساب بهذا الرقم. أنشئ حسابًا جديدًا بإدخال اسمك.", "NAME_REQUIRED", 422);
  }

  return prisma.user.create({
    data: {
      phoneE164,
      name,
      role: isBootstrapAdmin ? "ADMIN" : "USER",
    },
  });
}

/**
 * Step 1 of the 2-page flow. Normalize the phone and report whether an account
 * exists — WITHOUT creating one. For an existing account, returns the user
 * (promoting a bootstrap-admin phone, rejecting a deactivated one).
 */
export async function getPhoneLoginStatus(input: { country: string; phone: string }) {
  const phoneE164 = normalizePhone(input.phone, input.country);
  if (!phoneE164) {
    throw new LoginError("رقم الجوال غير صحيح", "INVALID_PHONE", 422);
  }
  const existing = await prisma.user.findUnique({ where: { phoneE164 } });
  if (!existing) return { phoneE164, user: null as null };

  if (!existing.isActive) {
    throw new LoginError("تم إيقاف هذا الحساب. تواصل مع الإدارة.", "USER_INACTIVE", 403);
  }
  if (adminPhones().has(phoneE164) && existing.role !== "ADMIN") {
    const promoted = await prisma.user.update({ where: { id: existing.id }, data: { role: "ADMIN" } });
    return { phoneE164, user: promoted };
  }
  return { phoneE164, user: existing };
}

/**
 * Step 2 of the 2-page flow. Create the account for an already-verified pending
 * phone (E.164). Re-validates server-side: registration must be open (unless a
 * bootstrap admin), and a name is required. Idempotent if the phone now exists.
 */
export async function completePhoneSignup(phoneE164: string, rawName: string) {
  const isBootstrapAdmin = adminPhones().has(phoneE164);
  const existing = await prisma.user.findUnique({ where: { phoneE164 } });
  if (existing) {
    if (!existing.isActive) {
      throw new LoginError("تم إيقاف هذا الحساب. تواصل مع الإدارة.", "USER_INACTIVE", 403);
    }
    return existing; // already created (e.g. double submit) — just log in
  }
  if (!isBootstrapAdmin && !(await isRegistrationOpen())) {
    throw new LoginError("تم إغلاق تسجيل المشاركين الجدد.", "REGISTRATION_CLOSED", 403);
  }
  const name = (rawName ?? "").trim();
  if (name.length < 2) {
    throw new LoginError("الاسم مطلوب", "NAME_REQUIRED", 422);
  }
  return prisma.user.create({
    data: { phoneE164, name, role: isBootstrapAdmin ? "ADMIN" : "USER" },
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

/**
 * Permanently delete a user account and everything tied to it.
 *
 * Cascades (schema `onDelete: Cascade`): predictions, prediction audit log,
 * group memberships. Handled here manually:
 *  - Groups the user LEADS are transferred to the earliest remaining member, or
 *    deleted if the user was the only member (no leaderless groups left behind).
 *  - LeaderboardEntry (no FK) and the user's admin result-audit rows (RESTRICT)
 *    are removed so the delete succeeds.
 * Leaderboard ranks are rebuilt afterwards.
 */
export async function deleteUserAccount(userId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const ledGroups = await tx.group.findMany({
      where: { leaderId: userId },
      select: { id: true },
    });
    for (const g of ledGroups) {
      const heir = await tx.groupMember.findFirst({
        where: { groupId: g.id, userId: { not: userId } },
        orderBy: { joinedAt: "asc" },
        select: { id: true, userId: true },
      });
      if (heir) {
        await tx.group.update({ where: { id: g.id }, data: { leaderId: heir.userId } });
        await tx.groupMember.update({ where: { id: heir.id }, data: { role: "LEADER" } });
      } else {
        // Only the leaving user was in it — drop the empty group.
        await tx.group.delete({ where: { id: g.id } });
      }
    }

    await tx.leaderboardEntry.deleteMany({ where: { userId } });
    await tx.matchResultAuditLog.deleteMany({ where: { adminUserId: userId } });
    await tx.user.delete({ where: { id: userId } });
  });

  // Re-rank everyone now that this user's rows are gone.
  await recalculateLeaderboard();
}

/** Active-admin count guard — prevents removing the last admin. */
export async function isLastAdmin(userId: string): Promise<boolean> {
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (target?.role !== "ADMIN") return false;
  const admins = await prisma.user.count({ where: { role: "ADMIN" } });
  return admins <= 1;
}
