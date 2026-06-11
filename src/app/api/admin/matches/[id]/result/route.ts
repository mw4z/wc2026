import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { matchResultSchema } from "@/lib/validation";
import { updateMatchResult } from "@/lib/matches";
import { errorResponse } from "@/lib/api";

export const runtime = "nodejs"; // scoring sends web-push (needs Node crypto)

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const input = matchResultSchema.parse(await req.json());
    const match = await updateMatchResult(admin.id, id, input);
    return NextResponse.json({ match });
  } catch (e) {
    return errorResponse(e);
  }
}
