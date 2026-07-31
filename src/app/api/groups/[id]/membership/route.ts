import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

async function getMemberCount(groupId: string) {
  const rows = await sql`
    SELECT COUNT(*)::int AS count
    FROM group_members
    WHERE group_id = ${groupId}
  `;

  return rows[0]?.count ?? 0;
}

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
    const groupRows = await sql`SELECT id FROM rage_groups WHERE id = ${id} LIMIT 1`;
    if (groupRows.length === 0) {
      return NextResponse.json({ error: "Group not found." }, { status: 404 });
    }

    await sql`
      INSERT INTO group_members (group_id, user_id, role)
      VALUES (${id}, ${session.userId}, 'member')
      ON CONFLICT (group_id, user_id) DO NOTHING
    `;

    return NextResponse.json({
      success: true,
      is_member: true,
      member_count: await getMemberCount(id),
    });
  } catch (err) {
    console.error("Join group error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

export async function DELETE(
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
      DELETE FROM group_members
      WHERE group_id = ${id} AND user_id = ${session.userId}
    `;

    return NextResponse.json({
      success: true,
      is_member: false,
      member_count: await getMemberCount(id),
    });
  } catch (err) {
    console.error("Leave group error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
