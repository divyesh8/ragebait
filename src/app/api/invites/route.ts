import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { inviteCreateSchema } from "@/lib/validation";

/** Flips any pending invites past their 24h expiry into 'expired'. */
async function expireStaleInvites() {
  await sql`
    UPDATE battle_invites SET status = 'expired'
    WHERE status = 'pending' AND expires_at < now()
  `;
}

// Invite rows are joined with both the sender and recipient's user info;
// see the SELECT statements below for the exact column shape returned.

// GET /api/invites?box=received|sent  (default: received) — your pending challenges
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const box = req.nextUrl.searchParams.get("box") === "sent" ? "sent" : "received";

  try {
    await expireStaleInvites();

    const rows =
      box === "sent"
        ? await sql`
            SELECT
              i.id, i.title, i.topic, i.battle_type, i.mode, i.rounds, i.status,
              i.created_at, i.responded_at, i.expires_at, i.battle_id,
              fromu.id AS from_user_id, fromu.user_id::text AS from_public_user_id, fromu.username AS from_username, fromu.avatar_url AS from_avatar,
              tou.id AS to_user_id, tou.user_id::text AS to_public_user_id, tou.username AS to_username, tou.avatar_url AS to_avatar
            FROM battle_invites i
            JOIN users fromu ON fromu.id = i.from_user_id
            JOIN users tou ON tou.id = i.to_user_id
            WHERE i.from_user_id = ${session.userId}
            ORDER BY i.created_at DESC
            LIMIT 50
          `
        : await sql`
            SELECT
              i.id, i.title, i.topic, i.battle_type, i.mode, i.rounds, i.status,
              i.created_at, i.responded_at, i.expires_at, i.battle_id,
              fromu.id AS from_user_id, fromu.user_id::text AS from_public_user_id, fromu.username AS from_username, fromu.avatar_url AS from_avatar,
              tou.id AS to_user_id, tou.user_id::text AS to_public_user_id, tou.username AS to_username, tou.avatar_url AS to_avatar
            FROM battle_invites i
            JOIN users fromu ON fromu.id = i.from_user_id
            JOIN users tou ON tou.id = i.to_user_id
            WHERE i.to_user_id = ${session.userId}
            ORDER BY i.created_at DESC
            LIMIT 50
          `;

    return NextResponse.json({ invites: rows });
  } catch (err) {
    console.error("List invites error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

// POST /api/invites — challenge a specific user by username
export async function POST(req: NextRequest) {
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

  const parsed = inviteCreateSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return NextResponse.json({ error: firstError?.message ?? "Invalid input." }, { status: 400 });
  }

  const { toUsername, title, topic, battleType, mode, rounds } = parsed.data;

  try {
    const targetRows = await sql`
      SELECT id, user_id::text AS "userId", username
      FROM users
      WHERE LOWER(username) = LOWER(${toUsername.replace(/^@/, "")})
         OR user_id::text = ${toUsername.replace(/^@/, "")}
      LIMIT 1
    `;
    if (targetRows.length === 0) {
      return NextResponse.json({ error: `No user found for "${toUsername}".` }, { status: 404 });
    }
    const target = targetRows[0];

    if (target.id === session.userId) {
      return NextResponse.json({ error: "You can't challenge yourself." }, { status: 400 });
    }

    const rows = await sql`
      INSERT INTO battle_invites (from_user_id, to_user_id, title, topic, battle_type, mode, rounds)
      VALUES (${session.userId}, ${target.id}, ${title}, ${topic}, ${battleType}, ${mode}, ${rounds})
      RETURNING id, title, topic, battle_type, mode, rounds, status, created_at, expires_at
    `;

    return NextResponse.json({ invite: rows[0] }, { status: 201 });
  } catch (err) {
    console.error("Create invite error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
