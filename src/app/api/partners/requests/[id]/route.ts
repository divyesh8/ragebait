import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const action = String(body.action ?? "");

  try {
    const rows = await sql`
      SELECT id, requester_id, recipient_id, status
      FROM partner_requests
      WHERE id = ${params.id}
      LIMIT 1
    `;
    if (rows.length === 0) return NextResponse.json({ error: "Request not found." }, { status: 404 });

    const request = rows[0];
    const requesterId = String(request.requester_id);
    const recipientId = String(request.recipient_id);

    if (request.status !== "pending") {
      return NextResponse.json({ error: "This request is already closed." }, { status: 409 });
    }

    if (action === "accept") {
      if (recipientId !== session.userId) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
      await sql`
        UPDATE partner_requests
        SET status = 'accepted', responded_at = now()
        WHERE id = ${params.id}
      `;
      await sql`
        INSERT INTO partners (user_low_id, user_high_id)
        VALUES (LEAST(${requesterId}::uuid, ${recipientId}::uuid), GREATEST(${requesterId}::uuid, ${recipientId}::uuid))
        ON CONFLICT (user_low_id, user_high_id) DO NOTHING
      `;
      await createNotification({
        userId: requesterId,
        type: "partner_request_accepted",
        title: "Partner request accepted",
        body: `${session.username} accepted your request.`,
        actorId: session.userId,
      });
      return NextResponse.json({ relationship: "partner" });
    }

    if (action === "reject") {
      if (recipientId !== session.userId) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
      await sql`
        UPDATE partner_requests
        SET status = 'rejected', responded_at = now()
        WHERE id = ${params.id}
      `;
      return NextResponse.json({ relationship: "none" });
    }

    if (action === "cancel") {
      if (requesterId !== session.userId) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
      await sql`
        UPDATE partner_requests
        SET status = 'cancelled', responded_at = now()
        WHERE id = ${params.id}
      `;
      return NextResponse.json({ relationship: "none" });
    }

    return NextResponse.json({ error: "Unknown request action." }, { status: 400 });
  } catch (err) {
    console.error("Partner request action error:", err);
    return NextResponse.json({ error: "Unable to update request." }, { status: 500 });
  }
}
