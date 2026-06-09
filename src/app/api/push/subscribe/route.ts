import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api";

// Standard PushSubscription.toJSON() shape from the browser.
const schema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const { endpoint, keys } = schema.parse(await req.json());
    // Upsert by endpoint: re-subscribing on the same device updates the row and
    // re-binds it to the current user (don't create duplicates).
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: { userId: user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
      update: { userId: user.id, p256dh: keys.p256dh, auth: keys.auth },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
