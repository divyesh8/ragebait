import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";
import { ARENA_ENGINE_VERSION, OPENING_TURN } from "@/services/battleEngine";

// POST /api/battles/:id/join - authenticated user joins an open battle.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = params;

  try {
    await sql`
      UPDATE battles SET status = 'expired'
      WHERE id = ${id}
        AND status = 'waiting'
        AND battle_source = 'PLAYER_VS_PLAYER'
        AND expires_at < now()
    `;

    const existingRows = await sql`
      SELECT id, created_by, opponent_id, status, title, expires_at
      FROM battles
      WHERE id = ${id}
        AND battle_source = 'PLAYER_VS_PLAYER'
        AND battle_visibility = 'PUBLIC'
        AND hidden_from_players = FALSE
        AND is_ai_generated = FALSE
      LIMIT 1
    `;

    if (existingRows.length === 0) {
      return NextResponse.json({ error: "Battle not found." }, { status: 404 });
    }

    const battle = existingRows[0];

    if (battle.created_by === session.userId) {
      return NextResponse.json(
        { error: "You can't join your own battle." },
        { status: 409 }
      );
    }

    if (battle.status !== "waiting") {
      return NextResponse.json(
        { error: "This battle is no longer open." },
        { status: 409 }
      );
    }

    if (battle.opponent_id) {
      return NextResponse.json(
        { error: "This battle already has an opponent." },
        { status: 409 }
      );
    }

    // Arena engine activation: joining starts the duel — the challenger
    // (creator) gets the opening turn and the first exchange clock starts.
    // Battles joined before this deploy keep engine_version NULL (legacy flow).
    const joinedRows = await sql`
      UPDATE battles
      SET opponent_id = ${session.userId}, status = 'active', started_at = now(),
          engine_version = ${ARENA_ENGINE_VERSION},
          current_turn = ${OPENING_TURN},
          turn_deadline = now() + make_interval(secs => COALESCE(turn_seconds, 90))
      WHERE id = ${id}
        AND status = 'waiting'
        AND opponent_id IS NULL
        AND created_by != ${session.userId}
        AND battle_source = 'PLAYER_VS_PLAYER'
        AND battle_visibility = 'PUBLIC'
        AND hidden_from_players = FALSE
        AND is_ai_generated = FALSE
        AND (expires_at IS NULL OR expires_at >= now())
      RETURNING id, battle_code, title, topic, battle_type, mode, status, rounds, started_at
    `;

    if (joinedRows.length === 0) {
      return NextResponse.json(
        { error: "This battle is no longer open." },
        { status: 409 }
      );
    }

    await createNotification({
      userId: battle.created_by,
      type: "battle_joined",
      title: "Battle joined",
      body: `${session.username} joined your battle: ${battle.title}`,
      battleId: id,
      actorId: session.userId,
    });

    return NextResponse.json({ success: true, battle: joinedRows[0] });
  } catch (err) {
    console.error("Join battle error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
