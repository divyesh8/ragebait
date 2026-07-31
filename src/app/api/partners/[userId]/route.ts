import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest, { params }: { params: { userId: string } }) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  try {
    const targetRows = await sql`
      SELECT id
      FROM users
      WHERE id::text = ${params.userId}
         OR user_id::text = ${params.userId}
         OR LOWER(username) = LOWER(${params.userId})
      LIMIT 1
    `;
    if (targetRows.length === 0) return NextResponse.json({ error: "Player not found." }, { status: 404 });

    const targetId = String(targetRows[0].id);
    const deleted = await sql`
      DELETE FROM partners
      WHERE user_low_id = LEAST(${session.userId}::uuid, ${targetId}::uuid)
        AND user_high_id = GREATEST(${session.userId}::uuid, ${targetId}::uuid)
      RETURNING id
    `;

    if (deleted.length === 0) return NextResponse.json({ error: "Partner not found." }, { status: 404 });

    await createNotification({
      userId: targetId,
      type: "partner_removed",
      title: "Partner removed",
      body: `${session.username} removed the partnership.`,
      actorId: session.userId,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Remove partner error:", err);
    return NextResponse.json({ error: "Unable to remove partner." }, { status: 500 });
  }
}
