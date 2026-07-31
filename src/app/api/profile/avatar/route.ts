import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { avatarSelectSchema } from "@/lib/validation";
import { resolveAvatarId, resolveAvatarMeta } from "@/lib/avatars";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
};

// POST /api/profile/avatar — pick one of the curated avatar options
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401, headers: NO_STORE_HEADERS });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const parsed = avatarSelectSchema.safeParse(body);
  if (!parsed.success) {
    console.warn("Avatar save rejected: invalid payload", {
      userId: session.userId,
      issues: parsed.error.flatten().fieldErrors,
    });
    return NextResponse.json({ error: "Pick an avatar from the list." }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const url = resolveAvatarId(parsed.data.avatarId);
  const avatar = resolveAvatarMeta(parsed.data.avatarId);
  if (!url || !avatar) {
    console.warn("Avatar save rejected: unknown avatar id", {
      userId: session.userId,
      avatarId: parsed.data.avatarId,
    });
    return NextResponse.json({ error: "That's not a valid avatar option." }, { status: 400, headers: NO_STORE_HEADERS });
  }

  try {
    const rows = await sql`
      UPDATE users
      SET avatar_url = ${url}
      WHERE id = ${session.userId}
      RETURNING id::text AS id, user_id::text AS "userId", username, avatar_url
    `;

    if (rows.length === 0) {
      console.error("Avatar save failed: session user was not found", {
        userId: session.userId,
        avatarId: avatar.id,
      });
      return NextResponse.json({ error: "Your session is no longer valid. Please log in again." }, { status: 404, headers: NO_STORE_HEADERS });
    }

    const savedAvatarUrl = String(rows[0].avatar_url ?? "");
    if (savedAvatarUrl !== url) {
      console.error("Avatar save verification failed", {
        userId: session.userId,
        avatarId: avatar.id,
        expectedUrl: url,
        savedAvatarUrl,
      });
      return NextResponse.json({ error: "Profile picture could not be verified after saving." }, { status: 500, headers: NO_STORE_HEADERS });
    }

    return NextResponse.json(
      {
        success: true,
        avatarId: avatar.id,
        avatarUrl: savedAvatarUrl,
        avatar,
        user: {
          id: rows[0].id,
          userId: rows[0].userId,
          username: rows[0].username,
          avatar_url: savedAvatarUrl,
        },
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (err) {
    console.error("Select avatar error:", {
      userId: session.userId,
      avatarId: parsed.data.avatarId,
      error: err,
    });
    return NextResponse.json({ error: "Something went wrong." }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
