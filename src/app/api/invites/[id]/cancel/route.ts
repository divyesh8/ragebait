import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

// POST /api/invites/:id/cancel — sender only
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  try {
    const rows = await sql`SELECT from_user_id, status FROM battle_invites WHERE id = ${params.id} LIMIT 1`;
    if (rows.length === 0) {
      return NextResponse.json({ error: "Invite not found." }, { status: 404 });
    }
    if (rows[0].from_user_id !== session.userId) {
      return NextResponse.json({ error: "Only the sender can cancel this invite." }, { status: 403 });
    }
    if (rows[0].status !== "pending") {
      return NextResponse.json({ error: "This invite is no longer pending." }, { status: 409 });
    }

    const updated = await sql`
      UPDATE battle_invites SET status = 'cancelled', responded_at = now()
      WHERE id = ${params.id} AND status = 'pending'
      RETURNING id, status
    `;

    if (updated.length === 0) {
      return NextResponse.json({ error: "This invite is no longer pending." }, { status: 409 });
    }

    return NextResponse.json({ success: true, invite: updated[0] });
  } catch (err) {
    console.error("Cancel invite error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
