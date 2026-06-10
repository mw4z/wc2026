import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { syncResults } from "@/lib/resultSync";
import { errorResponse } from "@/lib/api";

// Admin-triggered force re-sync of a SINGLE match (e.g. to re-pull a corrected
// provider result). Unlike the cron, force=true re-syncs even SCORED / needs-review
// matches. Admin-only; manual entry still overrides.
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    const report = await syncResults({ matchIds: [id], force: true });
    return NextResponse.json(report);
  } catch (e) {
    return errorResponse(e);
  }
}
