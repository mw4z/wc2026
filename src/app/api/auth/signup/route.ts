import { NextResponse, type NextRequest } from "next/server";
import { signupCompleteSchema } from "@/lib/validation";
import { completePhoneSignup } from "@/lib/users";
import { getPendingSignup, clearPendingSignup, createSession } from "@/lib/auth";
import { assertGroupJoinable, joinGroupByCode, createGroup } from "@/lib/groups";
import { errorResponse } from "@/lib/api";

// Step 2 of the 2-page flow. The phone comes from the pending-signup cookie
// (never the request body / URL). Creates the account and optionally joins/creates
// a group. An invalid group code is rejected BEFORE the account is created, so the
// form keeps its values and the pending phone stays valid for a retry.
export async function POST(req: NextRequest) {
  try {
    const phoneE164 = await getPendingSignup();
    if (!phoneE164) {
      return NextResponse.json(
        { error: "انتهت صلاحية الجلسة، أعد إدخال رقم جوالك.", code: "NO_PENDING" },
        { status: 401 },
      );
    }

    const input = signupCompleteSchema.parse(await req.json());
    const groupCode = (input.groupCode || "").trim();
    const newGroupName = (input.newGroupName || "").trim();

    // Pre-validate group selection (no mutation yet).
    if (newGroupName && newGroupName.length < 2) {
      return NextResponse.json({ error: "اسم المجموعة قصير جدًا", code: "GROUP_NAME_SHORT" }, { status: 422 });
    }
    if (!newGroupName && groupCode) {
      await assertGroupJoinable(groupCode); // throws GroupError → handled by errorResponse
    }

    const user = await completePhoneSignup(phoneE164, input.name);
    await createSession({ userId: user.id, role: user.role, name: user.name });

    let groupId: string | null = null;
    if (newGroupName) {
      groupId = (await createGroup(user.id, newGroupName)).id;
    } else if (groupCode) {
      groupId = (await joinGroupByCode(user.id, groupCode)).group.id;
    }

    await clearPendingSignup();
    return NextResponse.json({ ok: true, groupId });
  } catch (e) {
    return errorResponse(e);
  }
}
