import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireCreatorFromRequest } from "@/lib/creator";

export const dynamic = "force-dynamic";

// GET /api/creator/search?q= — founder-only global search across users,
// battles, and battle messages. Read-only.
export async function GET(req: NextRequest) {
  const creator = await requireCreatorFromRequest(req);
  if (!creator) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ users: [], battles: [], messages: [] });

  const like = `%${q}%`;
  const [users, battles, messages] = await Promise.all([
    sql`
      SELECT id, user_id::text AS public_id, username, email, gender, aura, account_status, avatar_url
      FROM users
      WHERE username ILIKE ${like}
         OR email ILIKE ${like}
         OR gender ILIKE ${like}
         OR user_id::text = ${q}
         OR id::text = ${q}
      ORDER BY aura DESC LIMIT 8
    `,
    sql`
      SELECT b.id, b.title, b.topic, b.status, u.username AS creator_username
      FROM battles b JOIN users u ON u.id = b.created_by
      WHERE b.title ILIKE ${like} OR b.topic ILIKE ${like} OR b.id::text = ${q}
      ORDER BY b.created_at DESC LIMIT 8
    `,
    sql`
      SELECT bm.id, bm.battle_id, bm.content, u.username, bm.created_at
      FROM battle_messages bm JOIN users u ON u.id = bm.user_id
      WHERE bm.content ILIKE ${like}
      ORDER BY bm.created_at DESC LIMIT 8
    `,
  ]);

  return NextResponse.json({ users, battles, messages });
}
