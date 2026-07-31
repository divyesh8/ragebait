import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { AUTH_COOKIE_NAME, verifySession } from "@/lib/auth";
import { isFounderEmail } from "@/lib/creator";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
};

export async function GET(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ user: null }, { status: 200, headers: NO_STORE_HEADERS });
  }

  const session = await verifySession(token);
  if (!session) {
    return NextResponse.json({ user: null }, { status: 200, headers: NO_STORE_HEADERS });
  }

  try {
    const rows = await sql`
      SELECT id, user_id::text AS "userId", username, email, gender,
             show_gender_on_public_profile AS "showGenderOnPublicProfile",
             aura, level, xp, wins, losses, current_streak, best_streak, bio, avatar_url,
             country, languages, favorite_battle_category AS "favoriteBattleCategory",
             profile_visibility AS "profileVisibility",
             show_online_status AS "showOnlineStatus",
             show_last_seen AS "showLastSeen",
             partner_request_policy AS "partnerRequestPolicy",
             last_active_at AS "lastActiveAt",
             current_activity AS "currentActivity",
             created_at
      FROM users
      WHERE id = ${session.userId}
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json({ user: null }, { status: 200, headers: NO_STORE_HEADERS });
    }

    const user = rows[0];

    return NextResponse.json(
      {
        user: {
          ...user,
          languages: Array.isArray(user.languages) ? user.languages : ["English"],
          isCreator: isFounderEmail(user.email),
        },
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (err) {
    console.error("Session lookup error:", err);
    return NextResponse.json({ user: null }, { status: 200, headers: NO_STORE_HEADERS });
  }
}
