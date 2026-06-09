import { NextResponse } from "next/server";
import { requireUser, destroySession } from "@/lib/auth";
import { deleteUserAccount, isLastAdmin } from "@/lib/users";
import { errorResponse } from "@/lib/api";

// Self-service account deletion. The user deletes their own account, then the
// session is cleared so they're logged out immediately.
export async function DELETE() {
  try {
    const user = await requireUser();

    // Don't let the last admin delete the competition out from under itself.
    if (await isLastAdmin(user.id)) {
      return NextResponse.json(
        { error: "أنت آخر مدير — لا يمكن حذف الحساب. عيّن مديرًا آخر أولًا." },
        { status: 409 },
      );
    }

    await deleteUserAccount(user.id);
    await destroySession();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
