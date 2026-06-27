import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getMatchForm } from "@/lib/matchCenter";

// Each team's recent results (ESPN "last five") for the form sheet on a match card.
// Auth-gated; ESPN summary is cached ~20s in the data layer, so it's cheap.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id } = await params;
    const data = await getMatchForm(id);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ available: false, home: null, away: null }, { status: 200 });
  }
}
