import { sql } from "@/lib/db";

export interface ScoreSet {
  creativity: number;
  logic: number;
  humor: number;
  originality: number;
  comeback: number;
  entertainment: number;
}

export interface PlayerProfileSummary {
  id: string;
  userId: string;
  username: string;
  avatarUrl: string | null;
  aura: number;
  wins: number;
  losses: number;
  totalBattles: number;
  winRate: number;
  preferredStyle: string;
  favoriteTopics: string[];
  strengths: string[];
  weaknesses: string[];
  averages: ScoreSet;
  lastActiveAt: string | null;
}

export interface MatchRecommendation {
  opponent: PlayerProfileSummary;
  compatibilityScore: number;
  difficultyRating: "Easy" | "Fair" | "Challenging" | "Elite";
  predictedBattleQuality: number;
  predictedWinChance: number;
  reason: string;
}

export interface OpponentInsight {
  opponentStyle: string;
  strengths: string[];
  weaknesses: string[];
  averageScores: ScoreSet;
  favoriteTopics: string[];
  recentPerformance: string;
  summary: string;
  compatibility?: {
    score: number;
    difficulty: MatchRecommendation["difficultyRating"];
    predictedQuality: number;
    predictedWinChance: number;
    reason: string;
  };
}

const EMPTY_SCORES: ScoreSet = {
  creativity: 0,
  logic: 0,
  humor: 0,
  originality: 0,
  comeback: 0,
  entertainment: 0,
};

export async function getPlayerProfileSummary(userId: string): Promise<PlayerProfileSummary | null> {
  const rows = await sql`
    SELECT
      u.id, u.user_id::text AS public_user_id, u.username, u.avatar_url, u.aura, u.wins, u.losses,
      p.preferred_battle_style, p.favorite_topics, p.strengths, p.weaknesses,
      p.average_creativity, p.average_logic, p.average_humor, p.average_originality,
      p.average_comeback, p.average_entertainment,
      recent.last_active_at
    FROM users u
    LEFT JOIN player_ai_profiles p ON p.user_id = u.id
    LEFT JOIN (
      SELECT user_id, MAX(last_active_at) AS last_active_at
      FROM (
        SELECT created_by AS user_id, MAX(created_at) AS last_active_at
        FROM battles
        WHERE battle_source = 'PLAYER_VS_PLAYER' AND is_ai_generated = FALSE
        GROUP BY created_by
        UNION ALL
        SELECT opponent_id AS user_id, MAX(started_at) AS last_active_at
        FROM battles
        WHERE opponent_id IS NOT NULL AND battle_source = 'PLAYER_VS_PLAYER' AND is_ai_generated = FALSE
        GROUP BY opponent_id
        UNION ALL
        SELECT user_id, MAX(created_at) AS last_active_at FROM battle_messages GROUP BY user_id
      ) activity
      GROUP BY user_id
    ) recent ON recent.user_id = u.id
    WHERE u.id = ${userId}
    LIMIT 1
  `;

  return rows[0] ? rowToProfile(rows[0]) : null;
}

export async function getRecommendedOpponents(
  userId: string,
  limit = 8
): Promise<MatchRecommendation[]> {
  const viewer = await getPlayerProfileSummary(userId);
  if (!viewer) return [];

  const rows = await sql`
    SELECT
      u.id, u.user_id::text AS public_user_id, u.username, u.avatar_url, u.aura, u.wins, u.losses,
      p.preferred_battle_style, p.favorite_topics, p.strengths, p.weaknesses,
      p.average_creativity, p.average_logic, p.average_humor, p.average_originality,
      p.average_comeback, p.average_entertainment,
      recent.last_active_at
    FROM users u
    LEFT JOIN player_ai_profiles p ON p.user_id = u.id
    LEFT JOIN (
      SELECT user_id, MAX(last_active_at) AS last_active_at
      FROM (
        SELECT created_by AS user_id, MAX(created_at) AS last_active_at
        FROM battles
        WHERE battle_source = 'PLAYER_VS_PLAYER' AND is_ai_generated = FALSE
        GROUP BY created_by
        UNION ALL
        SELECT opponent_id AS user_id, MAX(started_at) AS last_active_at
        FROM battles
        WHERE opponent_id IS NOT NULL AND battle_source = 'PLAYER_VS_PLAYER' AND is_ai_generated = FALSE
        GROUP BY opponent_id
        UNION ALL
        SELECT user_id, MAX(created_at) AS last_active_at FROM battle_messages GROUP BY user_id
      ) activity
      GROUP BY user_id
    ) recent ON recent.user_id = u.id
    WHERE u.id != ${userId}
    ORDER BY COALESCE(recent.last_active_at, u.created_at) DESC, u.aura DESC
    LIMIT 80
  `;

  return rows
    .map((row) => scoreOpponentMatch(viewer, rowToProfile(row)))
    .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
    .slice(0, limit);
}

export async function getOpponentInsight(
  opponentId: string,
  viewerId?: string
): Promise<OpponentInsight | null> {
  const opponent = await getPlayerProfileSummary(opponentId);
  if (!opponent) return null;

  const viewer = viewerId ? await getPlayerProfileSummary(viewerId) : null;
  const match = viewer && viewer.id !== opponent.id ? scoreOpponentMatch(viewer, opponent) : null;
  const topStrength = opponent.strengths[0] ?? strongestMetric(opponent.averages);
  const topWeakness = opponent.weaknesses[0] ?? weakestMetric(opponent.averages);
  const recentPerformance = describeRecentPerformance(opponent);

  return {
    opponentStyle: opponent.preferredStyle,
    strengths: opponent.strengths.length ? opponent.strengths : [topStrength],
    weaknesses: opponent.weaknesses.length ? opponent.weaknesses : [topWeakness],
    averageScores: opponent.averages,
    favoriteTopics: opponent.favoriteTopics,
    recentPerformance,
    summary: `${opponent.username} leans ${opponent.preferredStyle.toLowerCase()}, performs best in ${topStrength}, and is still improving ${topWeakness}.`,
    compatibility: match
      ? {
          score: match.compatibilityScore,
          difficulty: match.difficultyRating,
          predictedQuality: match.predictedBattleQuality,
          predictedWinChance: match.predictedWinChance,
          reason: match.reason,
        }
      : undefined,
  };
}

export function scoreOpponentMatch(
  viewer: PlayerProfileSummary,
  opponent: PlayerProfileSummary
): MatchRecommendation {
  const auraGap = Math.abs(viewer.aura - opponent.aura);
  const auraFit = clamp(100 - auraGap / 8, 0, 100);
  const topicOverlap = overlapScore(viewer.favoriteTopics, opponent.favoriteTopics);
  const styleFit = viewer.preferredStyle === opponent.preferredStyle ? 68 : 86;
  const skillGap = Math.abs(overallSkill(viewer) - overallSkill(opponent));
  const skillFit = clamp(100 - skillGap * 1.35, 0, 100);
  const activity = activityScore(opponent.lastActiveAt);
  const compatibilityScore = Math.round(
    auraFit * 0.27 + topicOverlap * 0.22 + styleFit * 0.16 + skillFit * 0.25 + activity * 0.1
  );
  const predictedBattleQuality = Math.round(
    compatibilityScore * 0.48 + Math.min(100, (overallSkill(viewer) + overallSkill(opponent)) / 2) * 0.37 + activity * 0.15
  );
  const predictedWinChance = clamp(
    Math.round(50 + (overallSkill(viewer) - overallSkill(opponent)) * 0.35 + (viewer.aura - opponent.aura) / 35),
    18,
    82
  );
  const difficultyRating = difficultyFrom(predictedWinChance, opponent.aura - viewer.aura);
  const sharedTopic = firstOverlap(viewer.favoriteTopics, opponent.favoriteTopics);
  const reason = sharedTopic
    ? `Strong fit because you both show interest in ${sharedTopic}, with a ${difficultyRating.toLowerCase()} skill gap.`
    : `Recommended because the skill gap looks ${difficultyRating.toLowerCase()} and the predicted battle quality is high.`;

  return {
    opponent,
    compatibilityScore,
    difficultyRating,
    predictedBattleQuality,
    predictedWinChance,
    reason,
  };
}

export function rowToProfile(row: any): PlayerProfileSummary {
  const wins = Number(row.wins) || 0;
  const losses = Number(row.losses) || 0;
  const totalBattles = wins + losses;
  const favoriteTopics = parseFavoriteTopics(row.favorite_topics);
  const averages = normalizeScores({
    creativity: row.average_creativity,
    logic: row.average_logic,
    humor: row.average_humor,
    originality: row.average_originality,
    comeback: row.average_comeback,
    entertainment: row.average_entertainment,
  });

  return {
    id: String(row.id),
    userId: String(row.public_user_id ?? row.user_id ?? row.id),
    username: String(row.username),
    avatarUrl: typeof row.avatar_url === "string" ? row.avatar_url : null,
    aura: Number(row.aura) || 0,
    wins,
    losses,
    totalBattles,
    winRate: totalBattles > 0 ? Math.round((wins / totalBattles) * 100) : 0,
    preferredStyle: typeof row.preferred_battle_style === "string" ? row.preferred_battle_style : inferStyle(averages),
    favoriteTopics,
    strengths: parseStringArray(row.strengths),
    weaknesses: parseStringArray(row.weaknesses),
    averages,
    lastActiveAt: row.last_active_at ? new Date(row.last_active_at).toISOString() : null,
  };
}

export function overallSkill(profile: PlayerProfileSummary): number {
  const scores = Object.values(profile.averages);
  const averageScore = scores.reduce((sum, value) => sum + value, 0) / scores.length;
  const battleConfidence = Math.min(12, profile.totalBattles * 1.5);
  const winSignal = profile.totalBattles > 0 ? (profile.winRate - 50) * 0.18 : 0;
  const auraSignal = Math.min(18, Math.max(-18, profile.aura / 55));
  return clamp(averageScore + battleConfidence + winSignal + auraSignal, 0, 100);
}

function normalizeScores(raw: Partial<Record<keyof ScoreSet, unknown>>): ScoreSet {
  return {
    creativity: numeric(raw.creativity),
    logic: numeric(raw.logic),
    humor: numeric(raw.humor),
    originality: numeric(raw.originality),
    comeback: numeric(raw.comeback),
    entertainment: numeric(raw.entertainment),
  };
}

function numeric(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? clamp(Math.round(n), 0, 100) : 0;
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, 8);
}

function parseFavoriteTopics(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object" && "topic" in item) return String((item as { topic?: unknown }).topic ?? "");
      return "";
    })
    .filter((topic) => topic.trim().length > 0)
    .slice(0, 10);
}

function inferStyle(scores: ScoreSet): string {
  const entries = Object.entries(scores) as [keyof ScoreSet, number][];
  const [metric, value] = entries.sort((a, b) => b[1] - a[1])[0];
  if (value <= 0) return "Balanced";
  if (metric === "humor") return "Funny";
  if (metric === "logic") return "Logical";
  if (metric === "comeback") return "Aggressive";
  if (metric === "entertainment") return "Strategic";
  return "Creative";
}

function overlapScore(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 45;
  const lowerB = new Set(b.map((topic) => topic.toLowerCase()));
  const hits = a.filter((topic) => lowerB.has(topic.toLowerCase())).length;
  return clamp(45 + hits * 22, 0, 100);
}

function firstOverlap(a: string[], b: string[]): string | null {
  const lowerB = new Map(b.map((topic) => [topic.toLowerCase(), topic]));
  const hit = a.find((topic) => lowerB.has(topic.toLowerCase()));
  return hit ? lowerB.get(hit.toLowerCase()) ?? hit : null;
}

function activityScore(lastActiveAt: string | null): number {
  if (!lastActiveAt) return 42;
  const ageHours = (Date.now() - new Date(lastActiveAt).getTime()) / (1000 * 60 * 60);
  if (ageHours <= 24) return 100;
  if (ageHours <= 72) return 82;
  if (ageHours <= 168) return 66;
  return 45;
}

function difficultyFrom(predictedWinChance: number, auraDelta: number): MatchRecommendation["difficultyRating"] {
  if (predictedWinChance >= 65 && auraDelta < 150) return "Easy";
  if (predictedWinChance >= 43 && predictedWinChance <= 64) return "Fair";
  if (predictedWinChance >= 30) return "Challenging";
  return "Elite";
}

function describeRecentPerformance(profile: PlayerProfileSummary): string {
  if (profile.totalBattles === 0) return "No judged battles yet, so the read is based on profile and activity signals.";
  if (profile.winRate >= 65) return `${profile.winRate}% win rate across ${profile.totalBattles} battles.`;
  if (profile.winRate >= 45) return `${profile.winRate}% win rate with balanced recent results.`;
  return `${profile.winRate}% win rate, likely beatable if you pressure their weak categories.`;
}

function strongestMetric(scores: ScoreSet): string {
  return labelForMetric((Object.entries(scores) as [keyof ScoreSet, number][]).sort((a, b) => b[1] - a[1])[0][0]);
}

function weakestMetric(scores: ScoreSet): string {
  return labelForMetric((Object.entries(scores) as [keyof ScoreSet, number][]).sort((a, b) => a[1] - b[1])[0][0]);
}

function labelForMetric(metric: keyof ScoreSet): string {
  const labels: Record<keyof ScoreSet, string> = {
    creativity: "creativity",
    logic: "logical arguments",
    humor: "humor",
    originality: "originality",
    comeback: "comebacks",
    entertainment: "entertainment",
  };
  return labels[metric];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
