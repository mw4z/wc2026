import { NextResponse, type NextRequest } from "next/server";
import { loginSchema, phoneLoginSchema } from "@/lib/validation";
import { loginOrRegister, loginOrRegisterByPhone } from "@/lib/users";
import { createSession } from "@/lib/auth";
import { errorResponse } from "@/lib/api";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Phone login is the primary flow; employeeId is a legacy fallback kept for
    // the admin transition. Phone responses never include the phone number.
    const user =
      body && typeof body.phone === "string"
        ? await loginOrRegisterByPhone(phoneLoginSchema.parse(body))
        : await loginOrRegister(loginSchema.parse(body));

    await createSession({ userId: user.id, role: user.role, name: user.name });
    return NextResponse.json({
      user: { id: user.id, name: user.name, role: user.role },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
