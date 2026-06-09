import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { otpVerifySchema } from "@/lib/validation";
import { prisma } from "@/lib/prisma";
import { verifyOtp } from "@/lib/authentica";
import { requireUser, getEmailChangePending, clearEmailChangePending } from "@/lib/auth";
import { errorResponse } from "@/lib/api";

export const runtime = "nodejs";

// Verify the OTP for the email the logged-in user is adding/changing, then set it.
// The email comes from the email-change cookie (never the body).
export async function POST(req: NextRequest) {
  try {
    const me = await requireUser();
    const email = await getEmailChangePending();
    if (!email) {
      return NextResponse.json(
        { error: "انتهت صلاحية الجلسة، أعد إدخال بريدك.", code: "NO_PENDING" },
        { status: 401 },
      );
    }

    const { otp } = otpVerifySchema.parse(await req.json());
    const ok = await verifyOtp(email, otp);
    if (!ok) {
      return NextResponse.json(
        { error: "رمز التحقق غير صحيح أو منتهي.", code: "OTP_INVALID" },
        { status: 422 },
      );
    }

    try {
      await prisma.user.update({ where: { id: me.id }, data: { email } });
    } catch (e) {
      // Unique race: someone took the email between send and verify.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        return NextResponse.json(
          { error: "هذا البريد مستخدم بحساب آخر.", code: "EMAIL_IN_USE" },
          { status: 409 },
        );
      }
      throw e;
    }

    await clearEmailChangePending();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
