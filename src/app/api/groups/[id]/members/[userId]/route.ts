import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { removeGroupMember, setMemberLeader } from "@/lib/groups";
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

// Grant or revoke CO-LEADER on this member (any current leader). Body { leader: boolean }.
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; userId: string }> },
) {
  try {
    const user = await requireUser();
    const { id, userId } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    await setMemberLeader(user.id, id, userId, body?.leader !== false);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
