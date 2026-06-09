import { NextResponse, type NextRequest } from "next/server";
import { emailStartSchema } from "@/lib/validation";
import { getEmailLoginStatus, normalizeEmail } from "@/lib/users";
import { createSession, createPendingSignup, createOtpPending } from "@/lib/auth";
import { otpConfigured, sendEmailOtp } from "@/lib/authentica";
import { errorResponse } from "@/lib/api";

// Step 1 of the email flow. Email only:
//  - OTP configured  → email a code, store an otp-pending cookie, { otpRequired: true }.
//                      Existing-vs-new is decided after the code is verified.
//  - OTP not configured → fall back to no-verification: existing email logs in
//                      ({ exists: true }), new email opens a pending signup ({ exists: false }).
export async function POST(req: NextRequest) {
  try {
    const { email } = emailStartSchema.parse(await req.json());
    const normalized = normalizeEmail(email);

    if (otpConfigured) {
      await sendEmailOtp(normalized);
      await createOtpPending(normalized); // unverified email, pending OTP
      return NextResponse.json({ otpRequired: true });
    }

    // No OTP provider configured → verification-free flow.
    const { user } = await getEmailLoginStatus({ email: normalized });
    if (user) {
      await createSession({ userId: user.id, role: user.role, name: user.name });
      return NextResponse.json({ exists: true });
    }
    await createPendingSignup(normalized);
    return NextResponse.json({ exists: false });
  } catch (e) {
    return errorResponse(e);
  }
}
