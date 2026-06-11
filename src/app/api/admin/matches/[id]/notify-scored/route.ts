import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { notifyMatchScored } from "@/lib/notifications";
import { errorResponse } from "@/lib/api";

export const runtime = "nodejs"; // web-push needs Node crypto

// Admin: (re)send the "scored" push for a match — e.g. a result that finished
// before the immediate-push behavior shipped. Deduped via PushReminder, so each
// predictor is notified at most once no matter how many times this is clicked.
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    const sent = await notifyMatchScored(id);
    return NextResponse.json({ ok: true, sent });
  } catch (e) {
    return errorResponse(e);
  }
}
