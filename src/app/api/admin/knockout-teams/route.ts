import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { assignKnockoutTeamsFromEspn } from "@/lib/resultSync";
import { errorResponse } from "@/lib/api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Fill knockout (TBD) matches with the teams ESPN has determined.
//   GET  → dry-run preview (what WOULD be assigned)
//   POST → apply the assignment
export async function GET() {
  try {
    await requireAdmin();
    const report = await assignKnockoutTeamsFromEspn({ apply: false });
    return NextResponse.json(report);
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST() {
  try {
    await requireAdmin();
    const report = await assignKnockoutTeamsFromEspn({ apply: true });
    return NextResponse.json(report);
  } catch (e) {
    return errorResponse(e);
  }
}
