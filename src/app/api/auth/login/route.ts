import { NextResponse, type NextRequest } from "next/server";
import { loginSchema, phoneLoginSchema } from "@/lib/validation";
import { loginOrRegister, loginOrRegisterByPhone } from "@/lib/users";
import { joinGroupByCode, createGroup, GroupError } from "@/lib/groups";
import { createSession } from "@/lib/auth";
import { errorResponse } from "@/lib/api";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Phone login is the primary flow; employeeId is a legacy fallback kept for
    // the admin transition. Phone responses never include the phone number.
    const user =
      body && typeof body.phone === "string"
        ? await loginOrRegisterByPhone(phoneLoginSchema.parse(body))
        : await loginOrRegister(loginSchema.parse(body));

    await createSession({ userId: user.id, role: user.role, name: user.name });

    // Group membership is OPTIONAL at sign-in. If the user supplies a code or a
    // new group name we act on it; otherwise they sign in with no group and are
    // nudged to join/create afterwards (see GroupNudge). The session is already
    // set, so a bad code/name is surfaced softly (groupError) without blocking.
    const groupCode = typeof body?.groupCode === "string" ? body.groupCode.trim() : "";
    const newGroupName = typeof body?.newGroupName === "string" ? body.newGroupName.trim() : "";

    let groupId: string | null = null;
    let groupError: string | null = null;

    if (newGroupName) {
      if (newGroupName.length < 2) {
        groupError = "اسم المجموعة قصير جدًا";
      } else {
        try {
          const group = await createGroup(user.id, newGroupName);
          groupId = group.id;
        } catch (e) {
          groupError = e instanceof GroupError ? e.message : "تعذّر إنشاء المجموعة";
        }
      }
    } else if (groupCode) {
      try {
        const { group } = await joinGroupByCode(user.id, groupCode);
        groupId = group.id;
      } catch (e) {
        groupError = e instanceof GroupError ? e.message : "تعذّر الانضمام إلى المجموعة";
      }
    }

    return NextResponse.json({
      user: { id: user.id, name: user.name, role: user.role },
      groupId,
      groupError,
    });
  } catch (e) {
    return errorResponse(e);
  }
}
