import { NextResponse, type NextRequest } from "next/server";
import { syncResultsFromEspn, refreshLiveScores } from "@/lib/resultSync";

// Auto result sync. Fetches final results from the football provider and scores
// finished matches via the existing scoring path. Manual admin entry remains the
// fallback/override and is never removed.
//
// Security: requires RESULT_SYNC_SECRET (external schedulers send it as
// `Authorization: Bearer <secret>` or `?key=<secret>`). Vercel's own Cron sends
// `Authorization: Bearer <CRON_SECRET>`, so that value is also accepted so the
// built-in cron works. Unauthenticated requests get a bare 401 — no details, and
// the secret is never logged.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function authorized(req: NextRequest): boolean {
  const accepted = [process.env.RESULT_SYNC_SECRET, process.env.CRON_SECRET].filter(Boolean) as string[];
  if (accepted.length === 0) return false; // no secret configured → deny (never run unprotected)
  const auth = req.headers.get("authorization") || "";
  const key = new URL(req.url).searchParams.get("key") || "";
  return accepted.some((s) => auth === `Bearer ${s}` || key === s);
}

async function handle(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    // Refresh live scores + capture/push goals every minute, so goal alerts fire
    // even when no client is polling. Best-effort — never blocks finalization.
    let liveCount = 0;
    try {
      const live = await refreshLiveScores();
      liveCount = live.length;
    } catch (e) {
      console.error("[sync-results] live refresh failed:", (e as Error).message);
    }
    const report = await syncResultsFromEspn();
    return NextResponse.json({ ...report, live: liveCount });
  } catch (e) {
    // Never break: log server-side, return a generic 500.
    console.error("[sync-results] unexpected:", (e as Error).message);
    return NextResponse.json({ error: "sync failed" }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
