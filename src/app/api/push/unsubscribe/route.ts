import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api";

const schema = z.object({ endpoint: z.string().url() });

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const { endpoint } = schema.parse(await req.json());
    // Only delete the caller's own subscription.
    await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: user.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
