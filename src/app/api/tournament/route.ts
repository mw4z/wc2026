import { NextResponse } from "next/server";
import { getTournamentData } from "@/lib/standings";

// Live tournament data (group standings + knockout bracket) for the Tournament
// page. Public — not sensitive. ESPN standings are cached ~30s in the data layer,
// so polling clients are cheap; the bracket reflects our DB's live/final scores.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const data = await getTournamentData();
    return NextResponse.json(data);
  } catch (e) {
    console.error("[tournament] failed:", (e as Error).message);
    return NextResponse.json({ groups: [], bracket: [] });
  }
}
