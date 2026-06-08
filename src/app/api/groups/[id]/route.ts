import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { groupRenameSchema } from "@/lib/validation";
import { renameGroup } from "@/lib/groups";
import { errorResponse } from "@/lib/api";

// Rename group (leader only — enforced server-side in renameGroup).
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const { name } = groupRenameSchema.parse(await req.json());
    const group = await renameGroup(user.id, id, name);
    return NextResponse.json({ group });
  } catch (e) {
    return errorResponse(e);
  }
}
