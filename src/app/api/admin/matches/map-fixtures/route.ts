import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { runFixtureMapping } from "@/lib/resultSync";
import { errorResponse } from "@/lib/api";

// Admin-triggered fixture mapping (runs server-side so it reaches the DB even when
// the admin's network can't). POST { apply: boolean } — apply=false is a dry run.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json().catch(() => ({}));
    const report = await runFixtureMapping({ apply: Boolean(body?.apply) });
    return NextResponse.json(report);
  } catch (e) {
    return errorResponse(e);
  }
}
