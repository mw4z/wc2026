import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { predictionSchema } from "@/lib/validation";
import { submitPrediction } from "@/lib/predictions";
import { errorResponse } from "@/lib/api";

// Create or update the current user's prediction for a match.
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const input = predictionSchema.parse(await req.json());
    const prediction = await submitPrediction(user.id, input);
    return NextResponse.json({ prediction });
  } catch (e) {
    return errorResponse(e);
  }
}
