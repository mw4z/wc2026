import { NextResponse, type NextRequest } from "next/server";
import { emailStartSchema } from "@/lib/validation";
import { normalizeEmail } from "@/lib/users";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { errorResponse } from "@/lib/api";

export const runtime = "nodejs";

// Logged-in user adds/changes their email — set DIRECTLY, no OTP. Verifying the
// email is a separate, optional step (see ./verify/*). Changing the address
// resets the verified flag. Rejects an email already used by another account.
export async function POST(req: NextRequest) {
  try {
    const me = await requireUser();
    const { email } = emailStartSchema.parse(await req.json());
    const normalized = normalizeEmail(email);

    const taken = await prisma.user.findUnique({ where: { email: normalized }, select: { id: true } });
    if (taken && taken.id !== me.id) {
      return NextResponse.json(
        { error: "هذا البريد مستخدم بحساب آخر.", code: "EMAIL_IN_USE" },
        { status: 409 },
      );
    }

    await prisma.user.update({
      where: { id: me.id },
      data: { email: normalized, emailVerified: false },
    });
    return NextResponse.json({ ok: true, updated: true });
  } catch (e) {
    return errorResponse(e);
  }
}
