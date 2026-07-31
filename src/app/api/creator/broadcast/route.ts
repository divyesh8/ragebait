import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireCreatorFromRequest, recordCreatorAction } from "@/lib/creator";
import { z } from "zod";

export const dynamic = "force-dynamic";

const broadcastSchema = z.object({
  title: z.string().min(2).max(120),
  body: z.string().min(2).max(500),
  audience: z.enum(["all", "active_7d", "restricted"]),
  reason: z.string().min(3, "A reason is required for every creator action."),
});

// POST /api/creator/broadcast — founder announcement into the in-app
// notification inbox for the chosen audience.
export async function POST(req: NextRequest) {
  const creator = await requireCreatorFromRequest(req);
  if (!creator) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = broadcastSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const { title, body, audience, reason } = parsed.data;

  let inserted;
  if (audience === "all") {
    inserted = await sql`
      INSERT INTO notifications (user_id, type, title, body)
      SELECT id, 'announcement', ${title}, ${body} FROM users
      RETURNING id
    `;
  } else if (audience === "active_7d") {
    inserted = await sql`
      INSERT INTO notifications (user_id, type, title, body)
      SELECT DISTINCT bm.user_id, 'announcement', ${title}, ${body}
      FROM battle_messages bm
      WHERE bm.created_at > now() - interval '7 days'
      RETURNING id
    `;
  } else {
    inserted = await sql`
      INSERT INTO notifications (user_id, type, title, body)
      SELECT id, 'announcement', ${title}, ${body} FROM users
      WHERE account_status <> 'active'
      RETURNING id
    `;
  }

  await recordCreatorAction({
    creatorUserId: creator.userId,
    action: "broadcast.announcement",
    newValue: { title, audience, recipients: inserted.length },
    reason,
    req,
  });

  return NextResponse.json({ success: true, recipients: inserted.length });
}
