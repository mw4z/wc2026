import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthError } from "./auth";
import { PredictionError } from "./predictions";
import { MatchError } from "./matches";
import { LoginError } from "./users";
import { GroupError } from "./groups";
import { AwardError } from "./awards";

/** Map known error types to JSON responses. Keeps route handlers thin. */
export function errorResponse(e: unknown): NextResponse {
  if (e instanceof ZodError) {
    return NextResponse.json(
      { error: "بيانات غير صحيحة", code: "VALIDATION", issues: e.issues.map((i) => i.message) },
      { status: 422 },
    );
  }
  if (
    e instanceof AuthError ||
    e instanceof PredictionError ||
    e instanceof MatchError ||
    e instanceof LoginError ||
    e instanceof GroupError ||
    e instanceof AwardError
  ) {
    const status = "status" in e ? e.status : 400;
    const code = "code" in e ? (e as { code?: string }).code : undefined;
    return NextResponse.json({ error: e.message, code }, { status });
  }
  console.error("Unhandled API error:", e);
  return NextResponse.json({ error: "حدث خطأ غير متوقع" }, { status: 500 });
}
