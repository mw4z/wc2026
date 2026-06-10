import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { submitAwardPrediction } from "@/lib/awards";
import { errorResponse } from "@/lib/api";

const schema = z.object({ awardId: z.string().min(1), candidateId: z.string().min(1) });

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const { awardId, candidateId } = schema.parse(await req.json());
    await submitAwardPrediction(user.id, awardId, candidateId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
