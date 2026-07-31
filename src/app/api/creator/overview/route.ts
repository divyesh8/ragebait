import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireCreatorFromRequest } from "@/lib/creator";
import { GENDER_VALUES, normalizeGender } from "@/lib/gender";

export const dynamic = "force-dynamic";

// GET /api/creator/overview — real platform telemetry for the command center.
// Every field here comes from the database; nothing is fabricated. Signals we
// don't actually collect (mouse position, keystrokes, GPS country) are simply
// not reported.
export async function GET(req: NextRequest) {
  const creator = await requireCreatorFromRequest(req);
  if (!creator) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const genderParam = req.nextUrl.searchParams.get("gender");
  const genderFilter = genderParam && genderParam !== "all" ? normalizeGender(genderParam) : null;
  if (genderParam && genderParam !== "all" && !genderFilter) {
    return NextResponse.json({ error: "Invalid gender filter." }, { status: 400 });
  }

  try {
    const [users, liveBattles, totals, activity, genderStats] = await Promise.all([
      sql`
        SELECT u.id, u.user_id::text AS public_id, u.username, u.email, u.email_verified,
               u.gender, u.show_gender_on_public_profile, u.aura, u.level, u.xp, u.wins, u.losses, u.avatar_url,
               u.account_status, u.status_reason, u.status_expires_at, u.created_at,
               RANK() OVER (ORDER BY u.aura DESC)::int AS aura_rank,
               COALESCE(warns.count, 0) AS warnings,
               COALESCE(blocks.count, 0) AS blocked_messages,
               GREATEST(last_msg.at, last_mod.at) AS last_activity
        FROM users u
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::int AS count FROM moderation_logs ml
          WHERE ml.user_id = u.id AND ml.action = 'WARN'
        ) warns ON TRUE
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::int AS count FROM moderation_logs ml
          WHERE ml.user_id = u.id AND ml.action = 'BLOCK'
        ) blocks ON TRUE
        LEFT JOIN LATERAL (
          SELECT MAX(bm.created_at) AS at FROM battle_messages bm WHERE bm.user_id = u.id
        ) last_msg ON TRUE
        LEFT JOIN LATERAL (
          SELECT MAX(ml.created_at) AS at FROM moderation_logs ml WHERE ml.user_id = u.id
        ) last_mod ON TRUE
        WHERE (${genderFilter}::text IS NULL OR u.gender = ${genderFilter})
        ORDER BY last_activity DESC NULLS LAST, u.created_at DESC
        LIMIT 50
      `,
      sql`
        SELECT b.id, b.title, b.topic, b.status, b.created_at, b.started_at,
               creator_u.username AS creator_username,
               opponent_u.username AS opponent_username,
               b.created_by, b.opponent_id
        FROM battles b
        JOIN users creator_u ON creator_u.id = b.created_by
        LEFT JOIN users opponent_u ON opponent_u.id = b.opponent_id
        WHERE b.status IN ('open', 'active', 'live', 'judging')
        ORDER BY b.created_at DESC
        LIMIT 15
      `,
      sql`
        SELECT
          (SELECT COUNT(*)::int FROM users) AS users,
          (SELECT COUNT(*)::int FROM users WHERE account_status <> 'active') AS restricted_users,
          (SELECT COUNT(*)::int FROM users WHERE created_at > now() - interval '24 hours') AS new_users_24h,
          (SELECT COUNT(*)::int FROM battles) AS battles,
          (SELECT COUNT(*)::int FROM battles WHERE status IN ('active', 'live')) AS live_battles,
          (SELECT COUNT(*)::int FROM battles WHERE created_at > now() - interval '24 hours') AS battles_created_24h,
          (SELECT COUNT(*)::int FROM battles WHERE completed_at > now() - interval '24 hours') AS battles_24h,
          (SELECT COUNT(*)::int FROM battle_messages WHERE created_at > now() - interval '24 hours') AS messages_24h,
          (SELECT COUNT(*)::int FROM moderation_logs WHERE created_at > now() - interval '24 hours') AS ai_decisions_24h,
          (SELECT COUNT(*)::int FROM reports WHERE status = 'pending') AS reports_pending,
          (SELECT COALESCE(SUM(ABS(amount)), 0)::int FROM aura_transactions WHERE created_at > now() - interval '24 hours') AS aura_moved_24h,
          (SELECT COUNT(*)::int FROM moderation_logs WHERE action = 'WARN') AS total_warns,
          (SELECT COUNT(*)::int FROM moderation_logs WHERE action = 'BLOCK') AS total_blocks
      `,
      sql`
        SELECT kind, label, detail, at FROM (
          SELECT 'founder' AS kind, al.action AS label, al.reason AS detail, al.created_at AS at
          FROM creator_audit_logs al
          UNION ALL
          SELECT 'moderation' AS kind, ml.action || ' • ' || ml.category AS label, ml.reason AS detail, ml.created_at AS at
          FROM moderation_logs ml
          WHERE ml.action <> 'ALLOW'
        ) events
        ORDER BY at DESC
        LIMIT 14
      `,
      sql`
        SELECT gender, COUNT(*)::int AS count
        FROM users
        WHERE gender IS NOT NULL
        GROUP BY gender
      `,
    ]);

    const totalWithGender = genderStats.reduce((sum, row) => sum + Number(row.count ?? 0), 0);
    const genderDistribution = GENDER_VALUES.map((gender) => {
      const count = Number(genderStats.find((row) => row.gender === gender)?.count ?? 0);
      return {
        gender,
        count,
        percentage: totalWithGender > 0 ? Math.round((count / totalWithGender) * 100) : 0,
      };
    });

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      totals: totals[0] ?? {},
      genderDistribution: {
        total: totalWithGender,
        values: genderDistribution,
      },
      users,
      liveBattles,
      activity,
    });
  } catch (err) {
    console.error("Creator overview error:", err);
    return NextResponse.json({ error: "Unable to load creator overview" }, { status: 500 });
  }
}
