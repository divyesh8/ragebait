import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { countMutualPartners, getRelationship, publicStatus, rankForAura } from "@/services/socialGraph";

export async function GET(
  req: NextRequest,
  { params }: { params: { username: string } }
) {
  const session = await getSessionFromRequest(req);
  const identity = decodeURIComponent(params.username).trim().replace(/^@/, "");

  if (!identity) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }

  try {
    const rows = await sql`
      SELECT
        id,
        user_id::text AS "userId",
        username,
        avatar_url,
        bio,
        gender,
        show_gender_on_public_profile,
        country,
        languages,
        favorite_battle_category,
        profile_visibility,
        show_online_status,
        show_last_seen,
        partner_request_policy,
        last_active_at,
        current_activity,
        aura,
        level,
        xp,
        wins,
        losses,
        current_streak,
        best_streak,
        created_at
      FROM users
      WHERE user_id::text = ${identity}
         OR LOWER(username) = LOWER(${identity})
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    }

    const user = rows[0];
    const relationship = await getRelationship(session?.userId ?? null, String(user.id));
    const isSelf = session?.userId === String(user.id);
    const canViewFull =
      isSelf ||
      user.profile_visibility === "public" ||
      (user.profile_visibility === "partners" && relationship.relationship === "partner");

    const [battleRows, auraRows, mutualPartners] = await Promise.all([
      canViewFull
        ? sql`
      SELECT
        b.id,
        b.battle_code,
        b.title,
        b.topic,
        b.battle_type,
        b.mode,
        b.status,
        b.winner_id,
        b.created_at,
        creator.id AS creator_id,
        creator.user_id::text AS "creatorUserId",
        creator.username AS creator_username,
        opponent.id AS opponent_id,
        opponent.user_id::text AS "opponentUserId",
        opponent.username AS opponent_username
      FROM battles b
      JOIN users creator ON creator.id = b.created_by
      LEFT JOIN users opponent ON opponent.id = b.opponent_id
      WHERE (b.created_by = ${user.id} OR b.opponent_id = ${user.id})
        AND b.status NOT IN ('cancelled', 'expired', 'deleted')
        AND b.battle_source = 'PLAYER_VS_PLAYER'
        AND b.battle_visibility = 'PUBLIC'
        AND b.hidden_from_players = FALSE
        AND b.is_ai_generated = FALSE
      ORDER BY b.created_at DESC
      LIMIT 20
    `
        : Promise.resolve([]),
      sql`
        SELECT
          COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0)::int AS earned,
          COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0)::int AS lost
        FROM aura_transactions
        WHERE user_id = ${user.id}
      `,
      countMutualPartners(session?.userId ?? null, String(user.id)),
    ]);

    const totalBattles = Number(user.wins ?? 0) + Number(user.losses ?? 0);
    const winRate = totalBattles > 0 ? Math.round((Number(user.wins) / totalBattles) * 100) : 0;
    const averageBattleLengthRows = canViewFull
      ? await sql`
          SELECT COALESCE(ROUND(AVG(message_count))::int, 0) AS average_length
          FROM (
            SELECT COUNT(*) AS message_count
            FROM battles b
            JOIN battle_messages bm ON bm.battle_id = b.id
            WHERE (b.created_by = ${user.id} OR b.opponent_id = ${user.id})
              AND b.battle_source = 'PLAYER_VS_PLAYER'
              AND b.battle_visibility = 'PUBLIC'
              AND b.hidden_from_players = FALSE
              AND b.is_ai_generated = FALSE
            GROUP BY b.id
          ) counts
        `
      : [{ average_length: 0 }];
    const mostUsedRows = canViewFull
      ? await sql`
          SELECT topic, COUNT(*)::int AS count
          FROM battles
          WHERE (created_by = ${user.id} OR opponent_id = ${user.id})
            AND battle_source = 'PLAYER_VS_PLAYER'
            AND battle_visibility = 'PUBLIC'
            AND hidden_from_players = FALSE
            AND is_ai_generated = FALSE
          GROUP BY topic
          ORDER BY count DESC
          LIMIT 1
        `
      : [];
    const averageScoreRows = canViewFull
      ? await sql`
          SELECT COALESCE(ROUND(AVG(
            CASE
              WHEN created_by = ${user.id} THEN NULLIF(ai_scores->'creator'->>'total', '')::numeric
              WHEN opponent_id = ${user.id} THEN NULLIF(ai_scores->'opponent'->>'total', '')::numeric
              ELSE NULL
            END
          ))::int, 0) AS average_score
          FROM battles
          WHERE (created_by = ${user.id} OR opponent_id = ${user.id})
            AND ai_scores IS NOT NULL
            AND battle_source = 'PLAYER_VS_PLAYER'
            AND battle_visibility = 'PUBLIC'
            AND hidden_from_players = FALSE
            AND is_ai_generated = FALSE
        `
      : [{ average_score: 0 }];

    const languages = Array.isArray(user.languages) ? user.languages : ["English"];

    return NextResponse.json({
      profile: {
        id: user.id,
        userId: user.userId,
        username: user.username,
        avatar: user.avatar_url,
        avatarUrl: user.avatar_url,
        bio: user.bio,
        gender: user.show_gender_on_public_profile ? user.gender : null,
        showGenderOnPublicProfile: Boolean(user.show_gender_on_public_profile),
        country: user.country ?? "Unknown",
        languages,
        favoriteBattleCategory: user.favorite_battle_category ?? "Debate",
        profileVisibility: user.profile_visibility ?? "public",
        status: publicStatus(user),
        lastActive: user.show_last_seen === false ? null : user.last_active_at,
        currentActivity: user.current_activity ?? "Browsing",
        rank: rankForAura(Number(user.aura ?? 0)),
        aura: user.aura,
        level: user.level,
        xp: user.xp,
        wins: user.wins,
        losses: user.losses,
        winRate,
        currentStreak: user.current_streak,
        bestStreak: user.best_streak,
        draws: 0,
        averageAiScore: Number(averageScoreRows[0]?.average_score ?? 0),
        averageBattleLength: Number(averageBattleLengthRows[0]?.average_length ?? 0),
        mostUsedBattleCategory: mostUsedRows[0]?.topic ?? user.favorite_battle_category ?? "Debate",
        favoriteLanguage: languages[0] ?? "English",
        totalAuraEarned: Number(auraRows[0]?.earned ?? 0),
        totalAuraLost: Number(auraRows[0]?.lost ?? 0),
        highestRankAchieved: rankForAura(Number(user.aura ?? 0)),
        totalBattles,
        createdAt: user.created_at,
        canViewFull,
      },
      social: {
        isSelf,
        relationship: relationship.relationship,
        pendingRequestId: relationship.pendingRequestId,
        mutualPartners,
      },
      battles: battleRows,
    });
  } catch (err) {
    console.error("Public profile lookup error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
