import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireCreatorFromRequest } from "@/lib/creator";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const creator = await requireCreatorFromRequest(req);
  if (!creator) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rows = await sql`
    SELECT id, topic, category, language_mode, status, scheduled_for, started_at, completed_at,
           duration_seconds, message_target, participant_a, participant_b, transcript,
           judge_result, winner_name, scores, summary, interesting_moments, error, created_at
    FROM simulation_battles
    ORDER BY created_at DESC
    LIMIT 500
  `;

  return new NextResponse(JSON.stringify({ exportedAt: new Date().toISOString(), simulations: rows }, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="ragebait-simulation-log-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
