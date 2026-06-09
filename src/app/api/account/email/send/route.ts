import { NextResponse, type NextRequest } from "next/server";
import { emailStartSchema } from "@/lib/validation";
import { normalizeEmail } from "@/lib/users";
import { prisma } from "@/lib/prisma";
import { requireUser, createEmailChangePending } from "@/lib/auth";
import { otpConfigured, sendEmailOtp } from "@/lib/authentica";
import { errorResponse } from "@/lib/api";

export const runtime = "nodejs";

// Logged-in user adds/changes their email. Sends an OTP to the new address (if
// OTP is configured); otherwise sets it directly. Rejects an email already in use.
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

    if (otpConfigured) {
      await sendEmailOtp(normalized);
      await createEmailChangePending(normalized);
      return NextResponse.json({ otpRequired: true });
    }

    // No OTP provider → set directly.
    await prisma.user.update({ where: { id: me.id }, data: { email: normalized } });
    return NextResponse.json({ ok: true, updated: true });
  } catch (e) {
    return errorResponse(e);
  }
}
