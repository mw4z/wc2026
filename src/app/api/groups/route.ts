import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { groupCreateSchema } from "@/lib/validation";
import { createGroup } from "@/lib/groups";
import { errorResponse } from "@/lib/api";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const { name } = groupCreateSchema.parse(await req.json());
    const group = await createGroup(user.id, name);
    return NextResponse.json({ group });
  } catch (e) {
    return errorResponse(e);
  }
}
