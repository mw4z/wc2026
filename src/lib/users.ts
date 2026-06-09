import { prisma } from "./prisma";
import { isRegistrationOpen } from "./settings";
import { recalculateLeaderboard } from "./leaderboard";
import type { LoginInput } from "./validation";

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

// Email bootstrap admins, comma-separated in ADMIN_EMAILS (case-insensitive).
function adminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function normalizeEmail(raw: string): string {
  return (raw ?? "").trim().toLowerCase();
}

/**
 * Step 1 (email flow). Report whether an account exists for this email WITHOUT
 * creating one. For an existing account, returns the user (promoting a bootstrap-
 * admin email to ADMIN, rejecting a deactivated one).
 */
export async function getEmailLoginStatus(input: { email: string }) {
  const email = normalizeEmail(input.email);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) return { email, user: null as null };

  if (!existing.isActive) {
    throw new LoginError("تم إيقاف هذا الحساب. تواصل مع الإدارة.", "USER_INACTIVE", 403);
  }
  if (adminEmails().has(email) && existing.role !== "ADMIN") {
    const promoted = await prisma.user.update({ where: { id: existing.id }, data: { role: "ADMIN" } });
    return { email, user: promoted };
  }
  return { email, user: existing };
}

/**
 * Step 2 (email flow). Create the account for an already-verified email.
 * Re-validates: registration must be open (unless a bootstrap admin) and a name
 * is required. Idempotent if the email now exists (e.g. double submit).
 */
export async function completeEmailSignup(email: string, rawName: string) {
  const e = normalizeEmail(email);
  const isBootstrapAdmin = adminEmails().has(e);
  const existing = await prisma.user.findUnique({ where: { email: e } });
  if (existing) {
    if (!existing.isActive) {
      throw new LoginError("تم إيقاف هذا الحساب. تواصل مع الإدارة.", "USER_INACTIVE", 403);
    }
    return existing;
  }
  if (!isBootstrapAdmin && !(await isRegistrationOpen())) {
    throw new LoginError("تم إغلاق تسجيل المشاركين الجدد.", "REGISTRATION_CLOSED", 403);
  }
  const name = (rawName ?? "").trim();
  if (name.length < 2) {
    throw new LoginError("الاسم مطلوب", "NAME_REQUIRED", 422);
  }
  return prisma.user.create({
    data: { email: e, name, role: isBootstrapAdmin ? "ADMIN" : "USER" },
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
