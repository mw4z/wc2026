import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api";

// Update the signed-in user's goal-notification preferences.
// Body: { notifyGoals?: boolean, notifyGoalsScope?: "ALL" | "PREDICTED" }
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));

    const data: { notifyGoals?: boolean; notifyGoalsScope?: string } = {};
    if (typeof body?.notifyGoals === "boolean") data.notifyGoals = body.notifyGoals;
    if (body?.notifyGoalsScope === "ALL" || body?.notifyGoalsScope === "PREDICTED") {
      data.notifyGoalsScope = body.notifyGoalsScope;
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "no valid fields" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data,
      select: { notifyGoals: true, notifyGoalsScope: true },
    });
    return NextResponse.json({ ok: true, ...updated });
  } catch (e) {
    return errorResponse(e);
  }
}
