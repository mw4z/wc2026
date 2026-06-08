import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { setGroupActive } from "@/lib/groups";
import { errorResponse } from "@/lib/api";

const schema = z.object({ isActive: z.boolean() });

// Admin: activate/deactivate a group.
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    const { isActive } = schema.parse(await req.json());
    const group = await setGroupActive(id, isActive);
    return NextResponse.json({ group });
  } catch (e) {
    return errorResponse(e);
  }
}
