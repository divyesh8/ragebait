import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { groupSchema } from "@/lib/validation";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  try {
    const rows = await sql`
      SELECT
        g.id,
        g.name,
        g.description,
        g.banner_url,
        g.topics,
        g.created_at,
        creator.username AS creator_username,
        (SELECT COUNT(*)::int FROM group_members gm WHERE gm.group_id = g.id) AS member_count,
        EXISTS (
          SELECT 1 FROM group_members mine
          WHERE mine.group_id = g.id AND mine.user_id = ${session.userId}
        ) AS is_member
      FROM rage_groups g
      LEFT JOIN users creator ON creator.id = g.created_by
      ORDER BY member_count DESC, g.created_at DESC
      LIMIT 60
    `;

    return NextResponse.json({ groups: rows });
  } catch (err) {
    console.error("List groups error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

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

  const parsed = groupSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return NextResponse.json({ error: firstError?.message ?? "Invalid input." }, { status: 400 });
  }

  const { name, description, topics, bannerUrl } = parsed.data;

  try {
    const groupRows = await sql`
      INSERT INTO rage_groups (name, description, banner_url, topics, created_by)
      VALUES (${name}, ${description}, ${bannerUrl}, ${topics}, ${session.userId})
      RETURNING id, name, description, banner_url, topics, created_at
    `;

    const group = groupRows[0];

    await sql`
      INSERT INTO group_members (group_id, user_id, role)
      VALUES (${group.id}, ${session.userId}, 'owner')
      ON CONFLICT (group_id, user_id) DO NOTHING
    `;

    return NextResponse.json(
      {
        group: {
          ...group,
          creator_username: session.username,
          member_count: 1,
          is_member: true,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      err.code === "23505"
    ) {
      return NextResponse.json({ error: "A group with that name already exists." }, { status: 409 });
    }

    console.error("Create group error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
