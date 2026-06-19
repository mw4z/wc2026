import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api";

// Marks the signed-in user as having the app installed (opened in standalone mode).
// Called once by the client when it detects display-mode: standalone. Idempotent —
// only stamps appInstalledAt the first time, so we stop the install push reminders.
export async function POST() {
  try {
    const user = await requireUser();
    await prisma.user.updateMany({
      where: { id: user.id, appInstalledAt: null },
      data: { appInstalledAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
