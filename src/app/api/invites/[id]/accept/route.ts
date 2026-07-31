import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { sql } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateBattleCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) code += CODE_ALPHABET[crypto.randomInt(0, CODE_ALPHABET.length)];
  return code;
}

async function generateUniqueBattleCode(): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generateBattleCode();
    const existing = await sql`SELECT 1 FROM battles WHERE battle_code = ${code} LIMIT 1`;
    if (existing.length === 0) return code;
  }
  throw new Error("Could not generate a unique battle code.");
}

// POST /api/invites/:id/accept — recipient only. Creates a battle that's
// already 'active' (both players are already committed, no waiting needed)
// and links it back to the invite.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  try {
    const rows = await sql`SELECT * FROM battle_invites WHERE id = ${params.id} LIMIT 1`;
    if (rows.length === 0) {
      return NextResponse.json({ error: "Invite not found." }, { status: 404 });
    }
    const invite = rows[0];

    if (invite.to_user_id !== session.userId) {
      return NextResponse.json({ error: "This invite isn't addressed to you." }, { status: 403 });
    }
    if (invite.status !== "pending") {
      return NextResponse.json({ error: "This invite is no longer pending." }, { status: 409 });
    }
    if (new Date(invite.expires_at).getTime() < Date.now()) {
      await sql`UPDATE battle_invites SET status = 'expired' WHERE id = ${params.id} AND status = 'pending'`;
      return NextResponse.json({ error: "This invite has expired." }, { status: 409 });
    }

    const battleCode = await generateUniqueBattleCode();

    const battleRows = await sql`
      INSERT INTO battles (title, topic, battle_type, mode, status, created_by, opponent_id, rounds, battle_code, expires_at, started_at)
      VALUES (${invite.title}, ${invite.topic}, ${invite.battle_type}, ${invite.mode}, 'active',
              ${invite.from_user_id}, ${invite.to_user_id}, ${invite.rounds}, ${battleCode}, now(), now())
      RETURNING id, battle_code, title, topic, status
    `;
    const battle = battleRows[0];

    const updated = await sql`
      UPDATE battle_invites
      SET status = 'accepted', responded_at = now(), battle_id = ${battle.id}
      WHERE id = ${params.id} AND status = 'pending'
      RETURNING id, status, battle_id
    `;

    if (updated.length === 0) {
      // Someone else responded to this invite in the split second between our
      // checks and the update — roll back the battle we just created.
      await sql`DELETE FROM battles WHERE id = ${battle.id}`;
      return NextResponse.json({ error: "This invite is no longer pending." }, { status: 409 });
    }

    return NextResponse.json({ success: true, battle });
  } catch (err) {
    console.error("Accept invite error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
