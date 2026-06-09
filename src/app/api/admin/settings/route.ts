import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import {
  isRegistrationOpen,
  setRegistrationOpen,
  getPredictionLead,
  setPredictionLead,
} from "@/lib/settings";
import { errorResponse } from "@/lib/api";

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({
      registrationOpen: await isRegistrationOpen(),
      predictionLead: await getPredictionLead(),
    });
  } catch (e) {
    return errorResponse(e);
  }
}

const schema = z.object({
  registrationOpen: z.boolean().optional(),
  predictionLead: z.enum(["always", "24", "12", "6", "2"]).optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin();
    const body = schema.parse(await req.json());
    if (typeof body.registrationOpen === "boolean") await setRegistrationOpen(body.registrationOpen);
    if (body.predictionLead) await setPredictionLead(body.predictionLead);
    return NextResponse.json({
      registrationOpen: await isRegistrationOpen(),
      predictionLead: await getPredictionLead(),
    });
  } catch (e) {
    return errorResponse(e);
  }
}
