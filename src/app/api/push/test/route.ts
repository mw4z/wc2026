import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pushConfigured, sendPush } from "@/lib/push";
import { getUI } from "@/lib/locale";
import { errorResponse } from "@/lib/api";

export const runtime = "nodejs"; // web-push needs Node crypto

// Admin-only: send a test notification to the calling admin's own devices,
// bypassing the cron's match/window/dedup conditions. Pure verification tool.
export async function POST() {
  try {
    const admin = await requireAdmin();
    const UI = await getUI();

    if (!pushConfigured) {
      return NextResponse.json(
        { error: UI.admin.testPushNotConfigured, code: "PUSH_NOT_CONFIGURED" },
        { status: 503 },
      );
    }

    const subs = await prisma.pushSubscription.findMany({ where: { userId: admin.id } });
    if (subs.length === 0) {
      return NextResponse.json(
        { error: UI.admin.testPushNoSub, code: "NO_SUBSCRIPTION" },
        { status: 409 },
      );
    }

    const payload = {
      title: UI.admin.testPushPayloadTitle,
      body: UI.admin.testPushPayloadBody,
      url: "/matches",
    };

    let sent = 0;
    for (const s of subs) {
      if (await sendPush({ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth }, payload)) sent++;
    }

    return NextResponse.json({ sent, total: subs.length });
  } catch (e) {
    return errorResponse(e);
  }
}
