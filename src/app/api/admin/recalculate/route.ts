import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { calculateMatchPoints } from "@/lib/matches";
import { recalculateLeaderboard } from "@/lib/leaderboard";
import { errorResponse } from "@/lib/api";

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
    return NextResponse.json({ ok: true, entries: count });
  } catch (e) {
    return errorResponse(e);
  }
}
