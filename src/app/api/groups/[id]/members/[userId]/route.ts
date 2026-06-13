import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { removeGroupMember, transferLeadership } from "@/lib/groups";
import { errorResponse } from "@/lib/api";

// Remove a member (leader only — enforced in removeGroupMember).
export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; userId: string }> },
) {
  try {
    const user = await requireUser();
    const { id, userId } = await ctx.params;
    await removeGroupMember(user.id, id, userId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}

// Make this member the group leader (current leader only). The caller is demoted.
export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; userId: string }> },
) {
  try {
    const user = await requireUser();
    const { id, userId } = await ctx.params;
    await transferLeadership(user.id, id, userId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
