import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { getOpponentInsight } from "@/services/aiMatchmaking";

// GET /api/battles/:id/insights - opponent insight before joining.
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSessionFromRequest(req);

  try {
    const rows = await sql`
      SELECT created_by, opponent_id
      FROM battles
      WHERE id = ${params.id}
        AND battle_source = 'PLAYER_VS_PLAYER'
        AND battle_visibility = 'PUBLIC'
        AND hidden_from_players = FALSE
        AND is_ai_generated = FALSE
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: "Battle not found." }, { status: 404 });
    }

    const opponentId =
      session && rows[0].created_by === session.userId && rows[0].opponent_id
        ? String(rows[0].opponent_id)
        : String(rows[0].created_by);

    const insight = await getOpponentInsight(opponentId, session?.userId);
    if (!insight) {
      return NextResponse.json({ error: "Opponent not found." }, { status: 404 });
    }

    return NextResponse.json({ insight });
  } catch (err) {
    console.error("Battle opponent insight error:", err);
    return NextResponse.json({ error: "Could not load opponent insight." }, { status: 500 });
  }
}
