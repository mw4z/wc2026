import { NextResponse, type NextRequest } from "next/server";
import { emailStartSchema } from "@/lib/validation";
import { getEmailLoginStatus, normalizeEmail } from "@/lib/users";
import { createSession, createPendingSignup } from "@/lib/auth";
import { errorResponse } from "@/lib/api";

// Step 1 of the email flow — no OTP. Email is the identity:
//  - existing email → log in immediately ({ exists: true }).
//  - new email      → open a pending signup ({ exists: false }).
// (Email-ownership verification is an optional action in the profile, not a
// gate on signing in.)
export async function POST(req: NextRequest) {
  try {
    const { email } = emailStartSchema.parse(await req.json());
    const normalized = normalizeEmail(email);

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
