import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { groupScoringSchema } from "@/lib/validation";
import { saveGroupScoring } from "@/lib/groups";
import { errorResponse } from "@/lib/api";

// Save the group's custom scoring (leader only — enforced in saveGroupScoring).
// Replaces the group-wide point values + mode and all per-match overrides at once.
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const input = groupScoringSchema.parse(await req.json());
    await saveGroupScoring(user.id, id, input);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
