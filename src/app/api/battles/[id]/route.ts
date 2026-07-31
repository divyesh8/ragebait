import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { battleEditSchema } from "@/lib/validation";
import { deriveEngineState, type ArenaBattleRow, type ArenaStrikeRow } from "@/services/battleEngine";

// GET /api/battles/:id — full battle detail including messages. Public — no auth required.
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  try {
    // Lazily expire if this specific battle's window passed.
    await sql`
      UPDATE battles SET status = 'expired'
      WHERE id = ${id}
        AND status = 'waiting'
        AND battle_source = 'PLAYER_VS_PLAYER'
        AND expires_at < now()
    `;

    const battleRows = await sql`
      SELECT
        b.id, b.battle_code, b.title, b.topic, b.battle_type, b.mode, b.status,
        b.rounds, b.winner_id, b.ai_summary, b.ai_scores,
        b.created_at, b.started_at, b.completed_at, b.expires_at,
        b.created_by, b.current_turn, b.turn_deadline, b.turn_seconds, b.engine_version,
        creator.id AS creator_id, creator.user_id::text AS creator_user_id, creator.username AS creator_username, creator.avatar_url AS creator_avatar,
        opponent.id AS opponent_id, opponent.user_id::text AS opponent_user_id, opponent.username AS opponent_username, opponent.avatar_url AS opponent_avatar
      FROM battles b
      JOIN users creator ON creator.id = b.created_by
      LEFT JOIN users opponent ON opponent.id = b.opponent_id
      WHERE b.id = ${id}
        AND b.battle_source = 'PLAYER_VS_PLAYER'
        AND b.battle_visibility = 'PUBLIC'
        AND b.hidden_from_players = FALSE
        AND b.is_ai_generated = FALSE
      LIMIT 1
    `;

    if (battleRows.length === 0) {
      return NextResponse.json({ error: "Battle not found." }, { status: 404 });
    }

    const messageRows = await sql`
      SELECT m.id, m.content, m.round, m.created_at, m.impact, m.control_after,
             u.id AS user_id, u.user_id::text AS public_user_id, u.username, u.avatar_url
      FROM battle_messages m
      JOIN users u ON u.id = m.user_id
      WHERE m.battle_id = ${id}
      ORDER BY m.created_at ASC
    `;

    // Arena engine state — same payload whether polled (Async Relay, today)
    // or pushed (Live Duel, later). Legacy battles report engaged: false.
    const engineState = deriveEngineState(
      battleRows[0] as unknown as ArenaBattleRow,
      messageRows as unknown as ArenaStrikeRow[],
      new Date()
    );

    return NextResponse.json({ battle: battleRows[0], messages: messageRows, engineState });
  } catch (err) {
    console.error("Get battle error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

// PATCH /api/battles/:id — owner-only edit (title/topic/rounds), only while still 'waiting'
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = battleEditSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return NextResponse.json({ error: firstError?.message ?? "Invalid input." }, { status: 400 });
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
      return NextResponse.json({ error: "Only the battle creator can edit it." }, { status: 403 });
    }
    if (existing[0].status !== "waiting") {
      return NextResponse.json(
        { error: "You can only edit a battle while it's still waiting for an opponent." },
        { status: 409 }
      );
    }

    const { title, topic, rounds } = parsed.data;
    const rows = await sql`
      UPDATE battles
      SET
        title  = COALESCE(${title ?? null}, title),
        topic  = COALESCE(${topic ?? null}, topic),
        rounds = COALESCE(${rounds ?? null}, rounds)
      WHERE id = ${params.id}
      RETURNING id, title, topic, rounds, battle_code, status
    `;

    return NextResponse.json({ battle: rows[0] });
  } catch (err) {
    console.error("Edit battle error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

// DELETE /api/battles/:id — owner-only SOFT delete.
//
// This never removes a row from the database. It only flips the battle to
// status = 'deleted' and stamps deleted_at / deleted_by, so:
//   - it disappears from the public feed / search / recommendations
//     (GET /api/battles already filters out status = 'deleted')
//   - it stays fully intact in the database: title, topic, creator,
//     participants, messages, AI scores, winner, aura changes, created_at
//   - it's still fetchable directly via GET /api/battles/:id so the creator's
//     profile history and the battle's own page can keep showing it
//     (the frontend renders a read-only "Battle Removed" state for it)
//
// The creator can delete at any point in the battle's lifecycle (waiting,
// active, judging, completed, cancelled, expired) — the only thing that
// blocks deletion is the battle already being deleted.
export async function DELETE(
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
      return NextResponse.json({ error: "Only the battle creator can delete it." }, { status: 403 });
    }
    if (existing[0].status === "deleted") {
      return NextResponse.json({ error: "This battle has already been deleted." }, { status: 409 });
    }

    const rows = await sql`
      UPDATE battles
      SET status = 'deleted', deleted_at = now(), deleted_by = ${session.userId}
      WHERE id = ${params.id} AND status != 'deleted'
      RETURNING id, status, deleted_at
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: "This battle has already been deleted." }, { status: 409 });
    }

    return NextResponse.json({ success: true, battle: rows[0] });
  } catch (err) {
    console.error("Delete battle error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
