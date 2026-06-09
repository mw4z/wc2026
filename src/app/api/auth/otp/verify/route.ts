import { NextResponse, type NextRequest } from "next/server";
import { otpVerifySchema } from "@/lib/validation";
import { verifyOtp } from "@/lib/authentica";
import { getEmailLoginStatus } from "@/lib/users";
import { getOtpPending, clearOtpPending, createPendingSignup, createSession } from "@/lib/auth";
import { errorResponse } from "@/lib/api";

export const runtime = "nodejs";

// Verify the email OTP. On success:
//  - existing account → create a session, { exists: true }
//  - new email        → create a pending-signup cookie, { exists: false }
// The email comes from the otp-pending cookie, never the request body.
export async function POST(req: NextRequest) {
  try {
    const email = await getOtpPending();
    if (!email) {
      return NextResponse.json(
        { error: "انتهت صلاحية الجلسة، أعد إدخال بريدك الإلكتروني.", code: "NO_OTP_PENDING" },
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

    await clearOtpPending();

    const { user } = await getEmailLoginStatus({ email });
    if (user) {
      await createSession({ userId: user.id, role: user.role, name: user.name });
      return NextResponse.json({ ok: true, exists: true });
    }

    await createPendingSignup(email); // verified → ready to create the account
    return NextResponse.json({ ok: true, exists: false });
  } catch (e) {
    return errorResponse(e);
  }
}
