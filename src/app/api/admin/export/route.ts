import { type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLeaderboard } from "@/lib/leaderboard";
import { errorResponse } from "@/lib/api";

function toCsv(headers: string[], rows: (string | number | null)[][]): string {
  const esc = (v: string | number | null) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
}

// GET /api/admin/export?type=leaderboard
// GET /api/admin/export?type=predictions[&matchId=...]
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const type = req.nextUrl.searchParams.get("type") ?? "leaderboard";
    let csv: string;
    let filename: string;

    if (type === "predictions") {
      const matchId = req.nextUrl.searchParams.get("matchId") ?? undefined;
      const preds = await prisma.prediction.findMany({
        where: matchId ? { matchId } : undefined,
        include: { user: true, match: true },
        orderBy: [{ matchId: "asc" }, { submittedAt: "asc" }],
      });
      csv = toCsv(
        ["match_number", "phone", "name", "pred_home", "pred_away", "points", "submitted_at"],
        preds.map((p) => [
          p.match.matchNumber,
          p.user.phoneE164 ?? p.user.employeeId ?? "",
          p.user.name,
          p.predictedHomeScore,
          p.predictedAwayScore,
          p.pointsAwarded,
          p.submittedAt.toISOString(),
        ]),
      );
      filename = "predictions.csv";
    } else {
      const lb = await getLeaderboard();
      csv = toCsv(
        ["rank", "name", "department", "total_points", "exact_scores", "correct_outcomes", "correct_qualifiers", "total_predictions", "accuracy"],
        lb.map((e) => [
          e.rank,
          e.name,
          e.department,
          e.totalPoints,
          e.exactScores,
          e.correctOutcomes,
          e.correctQualifiers,
          e.totalPredictions,
          (e.accuracy * 100).toFixed(1) + "%",
        ]),
      );
      filename = "leaderboard.csv";
    }

    return new Response("﻿" + csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
