import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pushConfigured, sendPush } from "@/lib/push";
import { openedPayload, closingPayload, scoredPayload } from "@/lib/notifications";
import { getUI } from "@/lib/locale";
import { errorResponse } from "@/lib/api";

export const runtime = "nodejs"; // web-push needs Node crypto

// Admin-only: send a sample of ALL three reminder types (opened / closing /
// scored) to the calling admin's own devices, bypassing the cron's
// match/window/dedup conditions. A one-tap preview of exactly what users get.
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

    // One sample of each type (distinct tags → all three show on the device).
    const payloads = [
      openedPayload(1),
      closingPayload(2),
      { ...scoredPayload({ line: "السعودية 2-1 الأرجنتين ⚽", points: 3, matchId: "demo" }), url: "/matches" },
    ];

    let sent = 0;
    for (const s of subs) {
      const sub = { endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth };
      for (const p of payloads) if (await sendPush(sub, p)) sent++;
    }

    return NextResponse.json({ sent, total: subs.length * payloads.length });
  } catch (e) {
    return errorResponse(e);
  }
}
