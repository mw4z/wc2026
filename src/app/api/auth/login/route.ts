import { NextResponse, type NextRequest } from "next/server";
import { loginSchema } from "@/lib/validation";
import { loginOrRegister } from "@/lib/users";
import { createSession } from "@/lib/auth";
import { errorResponse } from "@/lib/api";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = loginSchema.parse(body);
    const user = await loginOrRegister(input);
    await createSession({ userId: user.id, role: user.role, name: user.name });
    return NextResponse.json({
      user: { id: user.id, name: user.name, role: user.role, employeeId: user.employeeId },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
