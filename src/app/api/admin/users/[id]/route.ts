import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteUserAccount, isLastAdmin } from "@/lib/users";
import { errorResponse } from "@/lib/api";

// Admin-controlled user edits: rename, (de)activate, change role.
// employeeId is intentionally NOT editable.
const patchSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  isActive: z.boolean().optional(),
  role: z.enum(["USER", "ADMIN"]).optional(),
  department: z.string().trim().max(80).nullable().optional(),
});

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const data = patchSchema.parse(await req.json());

    // Guard: an admin can't deactivate or demote themselves (avoid lockout).
    if (id === admin.id && (data.isActive === false || data.role === "USER")) {
      return NextResponse.json(
        { error: "لا يمكنك تعطيل أو تخفيض صلاحيات حسابك" },
        { status: 409 },
      );
    }

    const user = await prisma.user.update({ where: { id }, data });
    return NextResponse.json({ user });
  } catch (e) {
    return errorResponse(e);
  }
}

// Permanently delete a user account (admin action).
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;

    if (id === admin.id) {
      return NextResponse.json(
        { error: "لا يمكنك حذف حسابك من هنا. استخدم صفحة ملفك الشخصي." },
        { status: 409 },
      );
    }
    if (await isLastAdmin(id)) {
      return NextResponse.json(
        { error: "لا يمكن حذف آخر حساب مدير." },
        { status: 409 },
      );
    }

    await deleteUserAccount(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
