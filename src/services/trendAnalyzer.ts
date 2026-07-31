import { sql } from "@/lib/db";

export interface TopicTrend {
  topic: string;
  score: number;
  battleCount: number;
  messageCount: number;
  activeCount: number;
  growthLabel: "new" | "rising" | "hot" | "steady";
}

export interface BattleStyleTrend {
  battleType: string;
  mode: string;
  score: number;
  battleCount: number;
}

export interface TrendReport {
  generatedAt: string;
  topics: TopicTrend[];
  styles: BattleStyleTrend[];
  mostCompetitivePlayers: {
    userId: string;
    username: string;
    aura: number;
    wins: number;
    losses: number;
    winRate: number;
  }[];
}

export interface TrendingBattle {
  id: string;
  battle_code: string;
  title: string;
  topic: string;
  battle_type: string;
  mode: string;
  status: string;
  created_at: string;
  creator_id: string;
  creator_user_id: string;
  creator_username: string;
  creator_avatar: string;
  opponent_id: string | null;
  opponent_user_id: string | null;
  opponent_username: string | null;
  opponent_avatar: string | null;
  engagement_score: number;
}

export async function analyzeTrends(): Promise<TrendReport> {
  const [topicRows, styleRows, playerRows] = await Promise.all([
    sql`
      SELECT
        b.topic,
        COUNT(DISTINCT b.id)::int AS battle_count,
        COUNT(m.id)::int AS message_count,
        COUNT(DISTINCT CASE WHEN b.status = 'active' THEN b.id END)::int AS active_count,
        MAX(b.created_at) AS newest_at
      FROM battles b
      LEFT JOIN battle_messages m ON m.battle_id = b.id
      WHERE b.created_at >= now() - interval '14 days'
        AND b.status NOT IN ('cancelled', 'expired', 'deleted')
        AND b.battle_source = 'PLAYER_VS_PLAYER'
        AND b.battle_visibility = 'PUBLIC'
        AND b.hidden_from_players = FALSE
        AND b.is_ai_generated = FALSE
      GROUP BY b.topic
      ORDER BY battle_count DESC, message_count DESC
      LIMIT 20
    `,
    sql`
      SELECT
        b.battle_type,
        b.mode,
        COUNT(*)::int AS battle_count,
        COUNT(m.id)::int AS message_count
      FROM battles b
      LEFT JOIN battle_messages m ON m.battle_id = b.id
      WHERE b.created_at >= now() - interval '14 days'
        AND b.status NOT IN ('cancelled', 'expired', 'deleted')
        AND b.battle_source = 'PLAYER_VS_PLAYER'
        AND b.battle_visibility = 'PUBLIC'
        AND b.hidden_from_players = FALSE
        AND b.is_ai_generated = FALSE
      GROUP BY b.battle_type, b.mode
      ORDER BY battle_count DESC, message_count DESC
      LIMIT 12
    `,
    sql`
      SELECT id, user_id::text AS public_user_id, username, aura, wins, losses
      FROM users
      WHERE wins + losses > 0
      ORDER BY aura DESC, wins DESC
      LIMIT 10
    `,
  ]);

  const topics = topicRows.map((row: any) => {
    const battleCount = Number(row.battle_count) || 0;
    const messageCount = Number(row.message_count) || 0;
    const activeCount = Number(row.active_count) || 0;
    const score = Math.round(battleCount * 18 + messageCount * 3 + activeCount * 15);
    return {
      topic: String(row.topic),
      score,
      battleCount,
      messageCount,
      activeCount,
      growthLabel: trendLabel(score, battleCount, row.newest_at),
    };
  });

  const styles = styleRows.map((row: any) => {
    const battleCount = Number(row.battle_count) || 0;
    const messageCount = Number(row.message_count) || 0;
    return {
      battleType: String(row.battle_type),
      mode: String(row.mode),
      score: Math.round(battleCount * 16 + messageCount * 2.5),
      battleCount,
    };
  });

  const mostCompetitivePlayers = playerRows.map((row: any) => {
    const wins = Number(row.wins) || 0;
    const losses = Number(row.losses) || 0;
    const total = wins + losses;
    return {
      userId: String(row.public_user_id ?? row.id),
      username: String(row.username),
      aura: Number(row.aura) || 0,
      wins,
      losses,
      winRate: total > 0 ? Math.round((wins / total) * 100) : 0,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    topics,
    styles,
    mostCompetitivePlayers,
  };
}

export async function getTrendingBattles(limit = 8): Promise<TrendingBattle[]> {
  const rows = await sql`
    SELECT
      b.id, b.battle_code, b.title, b.topic, b.battle_type, b.mode, b.status, b.created_at,
      creator.id AS creator_id, creator.user_id::text AS creator_user_id, creator.username AS creator_username, creator.avatar_url AS creator_avatar,
      opponent.id AS opponent_id, opponent.user_id::text AS opponent_user_id, opponent.username AS opponent_username, opponent.avatar_url AS opponent_avatar,
      (COUNT(m.id)::int * 6
        + CASE WHEN b.status = 'active' THEN 35 ELSE 0 END
        + CASE WHEN b.status = 'waiting' THEN 18 ELSE 0 END
        + GREATEST(0, 30 - EXTRACT(EPOCH FROM (now() - b.created_at)) / 3600)::int
      ) AS engagement_score
    FROM battles b
    JOIN users creator ON creator.id = b.created_by
    LEFT JOIN users opponent ON opponent.id = b.opponent_id
    LEFT JOIN battle_messages m ON m.battle_id = b.id
    WHERE b.status NOT IN ('cancelled', 'expired', 'deleted')
      AND b.battle_source = 'PLAYER_VS_PLAYER'
      AND b.battle_visibility = 'PUBLIC'
      AND b.hidden_from_players = FALSE
      AND b.is_ai_generated = FALSE
    GROUP BY b.id, creator.id, creator.user_id, creator.username, creator.avatar_url, opponent.id, opponent.user_id, opponent.username, opponent.avatar_url
    ORDER BY engagement_score DESC, b.created_at DESC
    LIMIT ${limit}
  `;

  return rows.map((row: any) => ({
    id: String(row.id),
    battle_code: String(row.battle_code),
    title: String(row.title),
    topic: String(row.topic),
    battle_type: String(row.battle_type),
    mode: String(row.mode),
    status: String(row.status),
    created_at: new Date(row.created_at).toISOString(),
    creator_id: String(row.creator_id),
    creator_user_id: String(row.creator_user_id),
    creator_username: String(row.creator_username),
    creator_avatar: String(row.creator_avatar ?? ""),
    opponent_id: row.opponent_id ? String(row.opponent_id) : null,
    opponent_user_id: row.opponent_user_id ? String(row.opponent_user_id) : null,
    opponent_username: row.opponent_username ? String(row.opponent_username) : null,
    opponent_avatar: row.opponent_avatar ? String(row.opponent_avatar) : null,
    engagement_score: Number(row.engagement_score) || 0,
  }));
}

export async function saveTrendSnapshot(report: TrendReport): Promise<void> {
  try {
    await sql`
      INSERT INTO trend_analytics (snapshot_key, payload, generated_at)
      VALUES ('global:v1', ${JSON.stringify(report)}, now())
      ON CONFLICT (snapshot_key) DO UPDATE SET
        payload = EXCLUDED.payload,
        generated_at = now()
    `;
  } catch (err) {
    console.error("saveTrendSnapshot failed:", err);
  }
}

function trendLabel(score: number, battleCount: number, newestAt: unknown): TopicTrend["growthLabel"] {
  const newestAgeHours = newestAt ? (Date.now() - new Date(String(newestAt)).getTime()) / (1000 * 60 * 60) : 999;
  if (battleCount <= 1 && newestAgeHours <= 48) return "new";
  if (score >= 90) return "hot";
  if (newestAgeHours <= 72) return "rising";
  return "steady";
}
