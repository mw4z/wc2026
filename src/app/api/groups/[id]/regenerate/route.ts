import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { regenerateGroupCode } from "@/lib/groups";
import { errorResponse } from "@/lib/api";

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const group = await regenerateGroupCode(user.id, id);
    return NextResponse.json({ code: group.code });
  } catch (e) {
    return errorResponse(e);
  }
}
