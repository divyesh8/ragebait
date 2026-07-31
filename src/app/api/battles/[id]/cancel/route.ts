import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

// POST /api/battles/:id/cancel — owner-only, only while still 'waiting'
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  try {
    const existing = await sql`
      SELECT created_by, status FROM battles
      WHERE id = ${params.id}
        AND battle_source = 'PLAYER_VS_PLAYER'
        AND is_ai_generated = FALSE
      LIMIT 1
    `;
    if (existing.length === 0) {
      return NextResponse.json({ error: "Battle not found." }, { status: 404 });
    }
    if (existing[0].created_by !== session.userId) {
      return NextResponse.json({ error: "Only the battle creator can cancel it." }, { status: 403 });
    }
    if (existing[0].status !== "waiting") {
      return NextResponse.json(
        { error: "Only battles still waiting for an opponent can be cancelled." },
        { status: 409 }
      );
    }

    const rows = await sql`
      UPDATE battles SET status = 'cancelled'
      WHERE id = ${params.id}
        AND status = 'waiting'
        AND battle_source = 'PLAYER_VS_PLAYER'
        AND is_ai_generated = FALSE
      RETURNING id, status
    `;

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Only battles still waiting for an opponent can be cancelled." },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: true, battle: rows[0] });
  } catch (err) {
    console.error("Cancel battle error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
