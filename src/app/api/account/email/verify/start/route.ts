import { NextResponse } from "next/server";
import { requireUser, createEmailChangePending } from "@/lib/auth";
import { otpConfigured, sendEmailOtp } from "@/lib/authentica";
import { errorResponse } from "@/lib/api";

export const runtime = "nodejs";

// Optional: send an OTP to the user's CURRENT email so they can verify ownership.
// Not part of sign-in/sign-up — purely a profile nicety.
export async function POST() {
  try {
    const me = await requireUser();
    if (!me.email) {
      return NextResponse.json({ error: "لا يوجد بريد لتأكيده.", code: "NO_EMAIL" }, { status: 400 });
    }
    if (!otpConfigured) {
      return NextResponse.json({ error: "التحقق غير متاح حاليًا.", code: "OTP_UNAVAILABLE" }, { status: 503 });
    }
    await sendEmailOtp(me.email);
    await createEmailChangePending(me.email);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
