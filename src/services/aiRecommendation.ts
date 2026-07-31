import { sql } from "@/lib/db";
import { getPlayerProfileSummary, overallSkill, PlayerProfileSummary, ScoreSet } from "@/services/aiMatchmaking";
import { TrendReport } from "@/services/trendAnalyzer";

export interface RecommendedBattle {
  id: string;
  battle_code: string;
  title: string;
  topic: string;
  battle_type: string;
  mode: string;
  status: string;
  rounds: number;
  created_at: string;
  expires_at: string | null;
  creator_id: string;
  creator_user_id: string;
  creator_username: string;
  creator_avatar: string;
  creator_aura: number;
  opponent_id: string | null;
  opponent_user_id: string | null;
  opponent_username: string | null;
  opponent_avatar: string | null;
  matchScore: number;
  recommendationReason: string;
  recommendationType: "interest" | "weakness" | "trending" | "skill" | "discovery" | "new";
}

export interface BattleRecommendationSet {
  recommended: RecommendedBattle[];
  matchingInterests: RecommendedBattle[];
  improveWeaknesses: RecommendedBattle[];
  trending: RecommendedBattle[];
  newBattles: RecommendedBattle[];
  discovery: RecommendedBattle[];
}

export async function recommendBattlesForUser(
  userId: string,
  trendReport: TrendReport,
  limit = 30
): Promise<BattleRecommendationSet> {
  const player = await getPlayerProfileSummary(userId);
  if (!player) {
    return emptySet();
  }

  const rows = await sql`
    SELECT
      b.id, b.battle_code, b.title, b.topic, b.battle_type, b.mode, b.status, b.rounds, b.created_at, b.expires_at,
      creator.id AS creator_id, creator.user_id::text AS creator_user_id, creator.username AS creator_username, creator.avatar_url AS creator_avatar,
      creator.aura AS creator_aura, creator.wins AS creator_wins, creator.losses AS creator_losses,
      opponent.id AS opponent_id, opponent.user_id::text AS opponent_user_id, opponent.username AS opponent_username, opponent.avatar_url AS opponent_avatar,
      p.preferred_battle_style, p.favorite_topics, p.strengths, p.weaknesses,
      p.average_creativity, p.average_logic, p.average_humor, p.average_originality,
      p.average_comeback, p.average_entertainment,
      COUNT(m.id)::int AS message_count
    FROM battles b
    JOIN users creator ON creator.id = b.created_by
    LEFT JOIN users opponent ON opponent.id = b.opponent_id
    LEFT JOIN player_ai_profiles p ON p.user_id = creator.id
    LEFT JOIN battle_messages m ON m.battle_id = b.id
    WHERE b.status IN ('waiting', 'active')
      AND b.created_by != ${userId}
      AND b.battle_source = 'PLAYER_VS_PLAYER'
      AND b.battle_visibility = 'PUBLIC'
      AND b.hidden_from_players = FALSE
      AND b.is_ai_generated = FALSE
    GROUP BY b.id, creator.id, creator.user_id, creator.username, creator.avatar_url, creator.aura, creator.wins, creator.losses,
             opponent.id, opponent.user_id, opponent.username, opponent.avatar_url, p.user_id
    ORDER BY b.created_at DESC
    LIMIT ${limit}
  `;

  const scored = rows
    .map((row: any) => scoreBattle(player, row, trendReport))
    .sort((a, b) => b.matchScore - a.matchScore);

  return {
    recommended: diversify(scored, 8),
    matchingInterests: diversify(scored.filter((battle) => battle.recommendationType === "interest"), 6),
    improveWeaknesses: diversify(scored.filter((battle) => battle.recommendationType === "weakness"), 6),
    trending: diversify(scored.filter((battle) => battle.recommendationType === "trending"), 6),
    newBattles: diversify(scored.filter((battle) => battle.recommendationType === "new"), 6),
    discovery: diversify(scored.filter((battle) => battle.recommendationType === "discovery"), 6),
  };
}

export function scoreBattle(
  player: PlayerProfileSummary,
  row: any,
  trendReport: TrendReport
): RecommendedBattle {
  const topic = String(row.topic);
  const creatorSkill = creatorSkillFromRow(row);
  const playerSkill = overallSkill(player);
  const skillGap = Math.abs(playerSkill - creatorSkill);
  const skillFit = clamp(100 - skillGap * 1.2, 0, 100);
  const interestFit = topicFit(topic, player.favoriteTopics);
  const weaknessFit = weaknessFitForBattle(player.weaknesses, topic, String(row.battle_type), String(row.mode));
  const trend = trendScore(topic, trendReport);
  const recency = recencyScore(row.created_at);
  const activity = Number(row.message_count) > 0 || row.status === "active" ? 75 : 55;
  const discovery = discoveryScore(topic, player.favoriteTopics);
  const matchScore = Math.round(
    interestFit * 0.28 + skillFit * 0.24 + weaknessFit * 0.18 + trend * 0.14 + recency * 0.1 + activity * 0.06
  );
  const recommendationType = classifyRecommendation({
    interestFit,
    weaknessFit,
    trend,
    recency,
    discovery,
    status: String(row.status),
  });

  return {
    id: String(row.id),
    battle_code: String(row.battle_code),
    title: String(row.title),
    topic,
    battle_type: String(row.battle_type),
    mode: String(row.mode),
    status: String(row.status),
    rounds: Number(row.rounds) || 3,
    created_at: new Date(row.created_at).toISOString(),
    expires_at: row.expires_at ? new Date(row.expires_at).toISOString() : null,
    creator_id: String(row.creator_id),
    creator_user_id: String(row.creator_user_id),
    creator_username: String(row.creator_username),
    creator_avatar: String(row.creator_avatar ?? ""),
    creator_aura: Number(row.creator_aura) || 0,
    opponent_id: row.opponent_id ? String(row.opponent_id) : null,
    opponent_user_id: row.opponent_user_id ? String(row.opponent_user_id) : null,
    opponent_username: row.opponent_username ? String(row.opponent_username) : null,
    opponent_avatar: row.opponent_avatar ? String(row.opponent_avatar) : null,
    matchScore,
    recommendationReason: reasonFor(recommendationType, {
      topic,
      skillGap,
      player,
      trend,
      creatorStyle: typeof row.preferred_battle_style === "string" ? row.preferred_battle_style : "Balanced",
    }),
    recommendationType,
  };
}

export function fallbackReason(topic: string): string {
  return `Trending now because ${topic} is getting fresh battle activity.`;
}

function emptySet(): BattleRecommendationSet {
  return {
    recommended: [],
    matchingInterests: [],
    improveWeaknesses: [],
    trending: [],
    newBattles: [],
    discovery: [],
  };
}

function creatorSkillFromRow(row: any): number {
  const wins = Number(row.creator_wins) || 0;
  const losses = Number(row.creator_losses) || 0;
  const total = wins + losses;
  const scores: ScoreSet = {
    creativity: Number(row.average_creativity) || 0,
    logic: Number(row.average_logic) || 0,
    humor: Number(row.average_humor) || 0,
    originality: Number(row.average_originality) || 0,
    comeback: Number(row.average_comeback) || 0,
    entertainment: Number(row.average_entertainment) || 0,
  };
  const scoreAverage = Object.values(scores).reduce((sum, value) => sum + value, 0) / 6;
  const fallback = total > 0 ? 45 + (wins / total) * 30 : 50;
  return scoreAverage > 0 ? scoreAverage : fallback + Math.min(15, (Number(row.creator_aura) || 0) / 80);
}

function topicFit(topic: string, favoriteTopics: string[]): number {
  if (favoriteTopics.length === 0) return 52;
  const lower = topic.toLowerCase();
  if (favoriteTopics.some((favorite) => favorite.toLowerCase() === lower)) return 100;
  if (favoriteTopics.some((favorite) => lower.includes(favorite.toLowerCase()) || favorite.toLowerCase().includes(lower))) return 82;
  return 42;
}

function weaknessFitForBattle(weaknesses: string[], topic: string, battleType: string, mode: string): number {
  const text = `${topic} ${battleType} ${mode}`.toLowerCase();
  if (weaknesses.some((weakness) => text.includes(weakness.toLowerCase().split(" ")[0]))) return 92;
  if (weaknesses.some((weakness) => /logic|argument|strategic/.test(weakness.toLowerCase())) && battleType === "ranked") return 86;
  if (weaknesses.some((weakness) => /humor|entertainment|creative/.test(weakness.toLowerCase())) && mode === "meme") return 82;
  return weaknesses.length > 0 ? 58 : 48;
}

function trendScore(topic: string, trendReport: TrendReport): number {
  const trend = trendReport.topics.find((item) => item.topic.toLowerCase() === topic.toLowerCase());
  if (!trend) return 45;
  return clamp(52 + trend.score / 2, 0, 100);
}

function recencyScore(createdAt: unknown): number {
  const hours = (Date.now() - new Date(String(createdAt)).getTime()) / (1000 * 60 * 60);
  if (hours <= 3) return 100;
  if (hours <= 24) return 82;
  if (hours <= 72) return 64;
  return 45;
}

function discoveryScore(topic: string, favorites: string[]): number {
  if (favorites.length === 0) return 70;
  return favorites.some((favorite) => favorite.toLowerCase() === topic.toLowerCase()) ? 35 : 78;
}

function classifyRecommendation(input: {
  interestFit: number;
  weaknessFit: number;
  trend: number;
  recency: number;
  discovery: number;
  status: string;
}): RecommendedBattle["recommendationType"] {
  if (input.interestFit >= 82) return "interest";
  if (input.weaknessFit >= 82) return "weakness";
  if (input.trend >= 78 || input.status === "active") return "trending";
  if (input.recency >= 90) return "new";
  if (input.discovery >= 70) return "discovery";
  return "skill";
}

function reasonFor(
  type: RecommendedBattle["recommendationType"],
  context: { topic: string; skillGap: number; player: PlayerProfileSummary; trend: number; creatorStyle: string }
): string {
  switch (type) {
    case "interest":
      return `Recommended because ${context.topic} matches your topic history and the skill gap looks fair.`;
    case "weakness":
      return `Good practice pick: this battle can help sharpen ${context.player.weaknesses[0] ?? "your weaker scoring areas"}.`;
    case "trending":
      return `Trending signal is high for ${context.topic}, with active engagement right now.`;
    case "new":
      return `Fresh open battle near your level, so you can get in before the matchup fills.`;
    case "discovery":
      return `A discovery pick outside your usual topics to keep recommendations from getting repetitive.`;
    default:
      return `Skill-balanced matchup against a ${context.creatorStyle.toLowerCase()} creator.`;
  }
}

function diversify(battles: RecommendedBattle[], limit: number): RecommendedBattle[] {
  const picked: RecommendedBattle[] = [];
  const topicCounts = new Map<string, number>();
  for (const battle of battles) {
    const count = topicCounts.get(battle.topic.toLowerCase()) ?? 0;
    if (count >= 2 && picked.length < limit - 1) continue;
    picked.push(battle);
    topicCounts.set(battle.topic.toLowerCase(), count + 1);
    if (picked.length >= limit) break;
  }
  return picked;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
