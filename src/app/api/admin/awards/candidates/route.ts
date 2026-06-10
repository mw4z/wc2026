import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { addCandidate, deleteCandidate } from "@/lib/awards";
import { errorResponse } from "@/lib/api";

const addSchema = z.object({
  awardId: z.string().min(1),
  nameAr: z.string().min(1),
  nameEn: z.string().min(1),
  team: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const { awardId, nameAr, nameEn, team } = addSchema.parse(await req.json());
    const candidate = await addCandidate(awardId, nameAr, nameEn, team);
    return NextResponse.json({ candidate });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin();
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
    await deleteCandidate(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
