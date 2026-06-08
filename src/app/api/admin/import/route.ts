import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { importMatchesCsv } from "@/lib/csv";
import { errorResponse } from "@/lib/api";

// Accepts either raw text/csv body or multipart form-data with a `file` field.
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    let text: string;
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "لم يتم رفع ملف" }, { status: 422 });
      }
      text = await file.text();
    } else {
      text = await req.text();
    }
    const summary = await importMatchesCsv(text);
    return NextResponse.json({ summary });
  } catch (e) {
    return errorResponse(e);
  }
}
