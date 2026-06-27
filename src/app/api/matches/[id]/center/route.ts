import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getMatchCenter } from "@/lib/matchCenter";

// Live lineups + formations + events for one match (from ESPN's free summary).
// Auth-gated like the rest of the app; ESPN data is cached ~20s in the data layer
// so polling clients are cheap.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id } = await params;
    const data = await getMatchCenter(id);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { available: false, state: "pre", statusDetail: "", home: null, away: null, events: [] },
      { status: 200 },
    );
  }
}
