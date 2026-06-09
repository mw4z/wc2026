import { cache } from "react";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@prisma/client";
import { prisma } from "./prisma";

const COOKIE = "wc26_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function secret(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error("SESSION_SECRET must be set and at least 32 chars.");
  }
  return new TextEncoder().encode(s);
}

export interface SessionPayload {
  userId: string;
  role: Role;
  name: string;
}

export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });
}

export async function destroySession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

// ---- Pending signup (phone verified at step 1, account created at step 2) ----
// A short-lived signed httpOnly cookie holding the normalized E.164 phone so the
// signup page never takes the phone from the URL or client state.
const PENDING_COOKIE = "wc26_pending";
const PENDING_MAX_AGE = 60 * 10; // 10 minutes

export async function createPendingSignup(email: string): Promise<void> {
  const token = await new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${PENDING_MAX_AGE}s`)
    .sign(secret());
  (await cookies()).set(PENDING_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: PENDING_MAX_AGE,
    path: "/",
  });
}

/** Returns the pending (verified) email, or null if missing/expired/invalid. */
export async function getPendingSignup(): Promise<string | null> {
  const token = (await cookies()).get(PENDING_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return (payload.email as string) || null;
  } catch {
    return null;
  }
}

export async function clearPendingSignup(): Promise<void> {
  (await cookies()).delete(PENDING_COOKIE);
}

// ---- OTP pending (phone awaiting WhatsApp verification, NOT yet verified) ----
// Holds the E.164 phone between the phone-entry step and OTP verification. Only
// after verify() succeeds do we upgrade this to a pending-signup cookie.
const OTP_COOKIE = "wc26_otp";
const OTP_MAX_AGE = 60 * 10; // 10 minutes

export async function createOtpPending(email: string): Promise<void> {
  const token = await new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${OTP_MAX_AGE}s`)
    .sign(secret());
  (await cookies()).set(OTP_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: OTP_MAX_AGE,
    path: "/",
  });
}

export async function getOtpPending(): Promise<string | null> {
  const token = (await cookies()).get(OTP_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return (payload.email as string) || null;
  } catch {
    return null;
  }
}

export async function clearOtpPending(): Promise<void> {
  (await cookies()).delete(OTP_COOKIE);
}

// ---- Email change (logged-in user adding/changing their email, OTP-verified) --
const EMAIL_CHANGE_COOKIE = "wc26_emailchg";
const EMAIL_CHANGE_MAX_AGE = 60 * 10; // 10 minutes

export async function createEmailChangePending(email: string): Promise<void> {
  const token = await new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${EMAIL_CHANGE_MAX_AGE}s`)
    .sign(secret());
  (await cookies()).set(EMAIL_CHANGE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: EMAIL_CHANGE_MAX_AGE,
    path: "/",
  });
}

export async function getEmailChangePending(): Promise<string | null> {
  const token = (await cookies()).get(EMAIL_CHANGE_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return (payload.email as string) || null;
  } catch {
    return null;
  }
}

export async function clearEmailChangePending(): Promise<void> {
  (await cookies()).delete(EMAIL_CHANGE_COOKIE);
}

/** Lightweight: trusts the signed cookie. Use in middleware / cheap checks. */
export async function getSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      userId: payload.userId as string,
      role: payload.role as Role,
      name: payload.name as string,
    };
  } catch {
    return null;
  }
}

/**
 * Authoritative: loads the user from DB (role changes take effect immediately).
 * Wrapped in React cache() so the layout + page in a single render share ONE
 * query instead of each hitting the DB.
 */
export const getCurrentUser = cache(async () => {
  const session = await getSession();
  if (!session) return null;
  return prisma.user.findUnique({ where: { id: session.userId } });
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("UNAUTHENTICATED", 401);
  if (!user.isActive) throw new AuthError("USER_INACTIVE", 403);
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new AuthError("FORBIDDEN", 403);
  return user;
}

export class AuthError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}
