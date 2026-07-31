import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { AUTH_COOKIE_NAME, getSessionFromRequest, signSession } from "@/lib/auth";
import { profileUpdateSchema } from "@/lib/validation";

export async function PATCH(req: NextRequest) {
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

  const parsed = profileUpdateSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return NextResponse.json({ error: firstError?.message ?? "Invalid input." }, { status: 400 });
  }

  const bioProvided = Object.prototype.hasOwnProperty.call(parsed.data, "bio");
  const genderProvided = Object.prototype.hasOwnProperty.call(parsed.data, "gender");
  const visibilityProvided = Object.prototype.hasOwnProperty.call(parsed.data, "showGenderOnPublicProfile");
  const countryProvided = Object.prototype.hasOwnProperty.call(parsed.data, "country");
  const languagesProvided = Object.prototype.hasOwnProperty.call(parsed.data, "languages");
  const favoriteCategoryProvided = Object.prototype.hasOwnProperty.call(parsed.data, "favoriteBattleCategory");
  const profileVisibilityProvided = Object.prototype.hasOwnProperty.call(parsed.data, "profileVisibility");
  const onlineStatusProvided = Object.prototype.hasOwnProperty.call(parsed.data, "showOnlineStatus");
  const lastSeenProvided = Object.prototype.hasOwnProperty.call(parsed.data, "showLastSeen");
  const requestPolicyProvided = Object.prototype.hasOwnProperty.call(parsed.data, "partnerRequestPolicy");

  try {
    const before = await sql`
      SELECT gender, show_gender_on_public_profile
      FROM users
      WHERE id = ${session.userId}
      LIMIT 1
    `;

    if (before.length === 0) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const rows = await sql`
      UPDATE users
      SET
        bio = CASE WHEN ${bioProvided} THEN ${parsed.data.bio ?? ""} ELSE bio END,
        avatar_url = COALESCE(${parsed.data.avatarUrl || null}, avatar_url),
        gender = COALESCE(${genderProvided ? parsed.data.gender ?? null : null}, gender),
        show_gender_on_public_profile = COALESCE(
          ${visibilityProvided ? parsed.data.showGenderOnPublicProfile ?? null : null},
          show_gender_on_public_profile
        ),
        country = CASE WHEN ${countryProvided} THEN ${parsed.data.country ?? "Unknown"} ELSE country END,
        languages = CASE WHEN ${languagesProvided} THEN ${JSON.stringify(parsed.data.languages ?? ["English"])}::jsonb ELSE languages END,
        favorite_battle_category = CASE WHEN ${favoriteCategoryProvided} THEN ${parsed.data.favoriteBattleCategory ?? "Debate"} ELSE favorite_battle_category END,
        profile_visibility = CASE WHEN ${profileVisibilityProvided} THEN ${parsed.data.profileVisibility ?? "public"} ELSE profile_visibility END,
        show_online_status = CASE WHEN ${onlineStatusProvided} THEN ${parsed.data.showOnlineStatus ?? true} ELSE show_online_status END,
        show_last_seen = CASE WHEN ${lastSeenProvided} THEN ${parsed.data.showLastSeen ?? true} ELSE show_last_seen END,
        partner_request_policy = CASE WHEN ${requestPolicyProvided} THEN ${parsed.data.partnerRequestPolicy ?? "anyone"} ELSE partner_request_policy END,
        last_active_at = now()
      WHERE id = ${session.userId}
      RETURNING id, user_id::text AS "userId", username, email, gender,
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
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const user = rows[0];

    if (
      genderProvided ||
      (visibilityProvided && before[0].show_gender_on_public_profile !== user.showGenderOnPublicProfile)
    ) {
      await sql`
        INSERT INTO user_profile_audit_logs (user_id, action, previous_value, new_value)
        VALUES (
          ${session.userId},
          ${genderProvided ? "profile.gender_update" : "profile.gender_visibility_update"},
          ${JSON.stringify({
            gender: before[0].gender,
            showGenderOnPublicProfile: before[0].show_gender_on_public_profile,
          })},
          ${JSON.stringify({
            gender: user.gender,
            showGenderOnPublicProfile: user.showGenderOnPublicProfile,
          })}
        )
      `;
    }

    const res = NextResponse.json({ user });

    if (genderProvided) {
      const token = await signSession({
        userId: session.userId,
        username: user.username,
        gender: user.gender ?? null,
      });
      res.cookies.set(AUTH_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    return res;
  } catch (err) {
    console.error("Update profile error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
