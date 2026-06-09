import { NextResponse } from "next/server";
import { otpConfigured, sendEmailOtp } from "@/lib/authentica";
import { getOtpPending } from "@/lib/auth";
import { errorResponse } from "@/lib/api";

export const runtime = "nodejs";

// Resend the email OTP to the address currently awaiting verification (read from
// the otp-pending cookie — never the body, so it can't be abused for arbitrary
// addresses).
export async function POST() {
  try {
    if (!otpConfigured) {
      return NextResponse.json({ error: "OTP غير مفعّل.", code: "OTP_DISABLED" }, { status: 503 });
    }
    const email = await getOtpPending();
    if (!email) {
      return NextResponse.json(
        { error: "انتهت صلاحية الجلسة، أعد إدخال بريدك الإلكتروني.", code: "NO_OTP_PENDING" },
        { status: 401 },
      );
    }
    await sendEmailOtp(email);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
