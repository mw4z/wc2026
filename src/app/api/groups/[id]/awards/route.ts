import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { setGroupAwardsEnabled } from "@/lib/groups";
import { errorResponse } from "@/lib/api";

const schema = z.object({ enabled: z.boolean() });

// Leader toggles tournament-award predictions for their group.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const { enabled } = schema.parse(await req.json());
    await setGroupAwardsEnabled(user.id, id, enabled);
    return NextResponse.json({ ok: true, enabled });
  } catch (e) {
    return errorResponse(e);
  }
}
