import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { groupJoinSchema } from "@/lib/validation";
import { joinGroupByCode } from "@/lib/groups";
import { errorResponse } from "@/lib/api";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const { code } = groupJoinSchema.parse(await req.json());
    const { group, alreadyMember } = await joinGroupByCode(user.id, code);
    return NextResponse.json({ groupId: group.id, alreadyMember });
  } catch (e) {
    return errorResponse(e);
  }
}
