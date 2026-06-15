import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { calculateMatchPoints } from "@/lib/matches";
import { recalculateLeaderboard } from "@/lib/leaderboard";
import { backfillLastMatchMovement } from "@/lib/rankMovement";
import { errorResponse } from "@/lib/api";

export const runtime = "nodejs"; // rescoring may send web-push (needs Node crypto)

// Body: { matchId } to rescore one match, or {} for a full leaderboard rebuild.
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await req.json().catch(() => ({}));
    if (body?.matchId) {
      const result = await calculateMatchPoints(body.matchId, admin.id);
      return NextResponse.json({ ok: true, ...result });
    }
    const count = await recalculateLeaderboard();
    // Seed rank-movement arrows from the last match already played (best-effort).
    let movementFrom: string | null = null;
    try {
      ({ matchId: movementFrom } = await backfillLastMatchMovement());
    } catch (e) {
      console.error("[recalculate] movement backfill failed:", (e as Error).message);
    }
    return NextResponse.json({ ok: true, entries: count, movementFrom });
  } catch (e) {
    return errorResponse(e);
  }
}
