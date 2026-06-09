import { NextResponse, type NextRequest } from "next/server";
import { loginSchema, phoneStartSchema } from "@/lib/validation";
import { loginOrRegister, getPhoneLoginStatus } from "@/lib/users";
import { createSession, createPendingSignup } from "@/lib/auth";
import { errorResponse } from "@/lib/api";

// Step 1 of the 2-page flow. Phone only:
//  - existing account  → log in, { exists: true }
//  - new phone         → store a pending signup cookie, { exists: false }
//                        (NO account is created here)
// Legacy employeeId login is kept for the admin transition.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body && typeof body.phone === "string") {
      const { phoneE164, user } = await getPhoneLoginStatus(phoneStartSchema.parse(body));
      if (user) {
        await createSession({ userId: user.id, role: user.role, name: user.name });
        return NextResponse.json({ exists: true });
      }
      await createPendingSignup(phoneE164);
      return NextResponse.json({ exists: false });
    }

    const legacy = await loginOrRegister(loginSchema.parse(body));
    await createSession({ userId: legacy.id, role: legacy.role, name: legacy.name });
    return NextResponse.json({ exists: true });
  } catch (e) {
    return errorResponse(e);
  }
}
