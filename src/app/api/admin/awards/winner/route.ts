import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { setAwardWinner } from "@/lib/awards";
import { errorResponse } from "@/lib/api";

const schema = z.object({ awardId: z.string().min(1), candidateId: z.string().min(1).nullable() });

// Set/clear the official winner of an award and (re)score all predictions.
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const { awardId, candidateId } = schema.parse(await req.json());
    const result = await setAwardWinner(awardId, candidateId);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return errorResponse(e);
  }
}
