import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { isRegistrationOpen, setRegistrationOpen } from "@/lib/settings";
import { errorResponse } from "@/lib/api";

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({ registrationOpen: await isRegistrationOpen() });
  } catch (e) {
    return errorResponse(e);
  }
}

const schema = z.object({ registrationOpen: z.boolean() });

export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin();
    const { registrationOpen } = schema.parse(await req.json());
    await setRegistrationOpen(registrationOpen);
    return NextResponse.json({ registrationOpen });
  } catch (e) {
    return errorResponse(e);
  }
}
