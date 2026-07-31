import { sql } from "@/lib/db";
import { recommendBattlesForUser, RecommendedBattle, fallbackReason } from "@/services/aiRecommendation";
import { getRecommendedOpponents, MatchRecommendation } from "@/services/aiMatchmaking";
import { analyzeTrends, getTrendingBattles, saveTrendSnapshot, TrendReport } from "@/services/trendAnalyzer";

export interface FeedSection<T> {
  id: string;
  title: string;
  items: T[];
}

export interface PersonalizedFeed {
  generatedAt: string;
  cache: "hit" | "miss" | "fallback";
  sections: {
    recommendedForYou: FeedSection<RecommendedBattle>;
    trendingNow: FeedSection<RecommendedBattle>;
    newBattles: FeedSection<RecommendedBattle>;
    matchingInterests: FeedSection<RecommendedBattle>;
    improveWeaknesses: FeedSection<RecommendedBattle>;
    playersToChallenge: FeedSection<MatchRecommendation>;
    similarPlayers: FeedSection<MatchRecommendation>;
    recentlyActiveOpponents: FeedSection<MatchRecommendation>;
    discovery: FeedSection<RecommendedBattle>;
  };
  trends: TrendReport;
}

const HOME_CACHE_KEY = "home-feed:v1";

export async function getPersonalizedFeed(userId: string, forceRefresh = false): Promise<PersonalizedFeed> {
  if (!forceRefresh) {
    const cached = await readFeedCache(userId);
    if (cached) return { ...cached, cache: "hit" };
  }

  try {
    const trends = await analyzeTrends();
    const [battleSet, opponents] = await Promise.all([
      recommendBattlesForUser(userId, trends),
      getRecommendedOpponents(userId, 14),
      saveTrendSnapshot(trends),
    ]);

    const feed: PersonalizedFeed = {
      generatedAt: new Date().toISOString(),
      cache: "miss",
      sections: {
        recommendedForYou: section("recommended-for-you", "Recommended For You", battleSet.recommended),
        trendingNow: section("trending-now", "Trending Now", mergeTrending(battleSet.trending, trends)),
        newBattles: section("new-battles", "New Battles", battleSet.newBattles),
        matchingInterests: section("matching-interests", "Battles Matching Your Interests", battleSet.matchingInterests),
        improveWeaknesses: section("improve-weaknesses", "Improve Your Weaknesses", battleSet.improveWeaknesses),
        playersToChallenge: section("players-to-challenge", "Players You Should Challenge", opponents.slice(0, 5)),
        similarPlayers: section(
          "similar-players",
          "Similar Players",
          opponents.filter((opponent) => opponent.difficultyRating === "Fair").slice(0, 5)
        ),
        recentlyActiveOpponents: section(
          "recently-active-opponents",
          "Recently Active Opponents",
          opponents
            .filter((opponent) => opponent.opponent.lastActiveAt)
            .sort(
              (a, b) =>
                new Date(b.opponent.lastActiveAt ?? 0).getTime() -
                new Date(a.opponent.lastActiveAt ?? 0).getTime()
            )
            .slice(0, 5)
        ),
        discovery: section("discovery", "Discover Something New", battleSet.discovery),
      },
      trends,
    };

    await writeFeedCache(userId, feed);
    await writeMatchRecommendations(userId, opponents);
    return feed;
  } catch (err) {
    console.error("getPersonalizedFeed failed, using fallback feed:", err);
    return fallbackFeed();
  }
}

export async function getGlobalFallbackFeed(): Promise<PersonalizedFeed> {
  return fallbackFeed();
}

async function readFeedCache(userId: string): Promise<PersonalizedFeed | null> {
  try {
    const rows = await sql`
      SELECT payload
      FROM recommendation_cache
      WHERE user_id = ${userId}
        AND cache_key = ${HOME_CACHE_KEY}
        AND expires_at > now()
      LIMIT 1
    `;
    return rows[0]?.payload ?? null;
  } catch (err) {
    console.error("readFeedCache failed:", err);
    return null;
  }
}

async function writeFeedCache(userId: string, feed: PersonalizedFeed): Promise<void> {
  try {
    await sql`
      INSERT INTO recommendation_cache (user_id, cache_key, payload, generated_at, expires_at)
      VALUES (${userId}, ${HOME_CACHE_KEY}, ${JSON.stringify(feed)}, now(), now() + interval '10 minutes')
      ON CONFLICT (user_id, cache_key) DO UPDATE SET
        payload = EXCLUDED.payload,
        generated_at = now(),
        expires_at = EXCLUDED.expires_at
    `;
  } catch (err) {
    console.error("writeFeedCache failed:", err);
  }
}

async function writeMatchRecommendations(userId: string, opponents: MatchRecommendation[]): Promise<void> {
  try {
    await sql`DELETE FROM match_recommendations WHERE user_id = ${userId}`;
    for (const opponent of opponents.slice(0, 12)) {
      await sql`
        INSERT INTO match_recommendations (
          user_id, opponent_id, compatibility_score, difficulty_rating,
          predicted_battle_quality, predicted_win_chance, reason, expires_at
        ) VALUES (
          ${userId}, ${opponent.opponent.id}, ${opponent.compatibilityScore},
          ${opponent.difficultyRating}, ${opponent.predictedBattleQuality},
          ${opponent.predictedWinChance}, ${opponent.reason}, now() + interval '30 minutes'
        )
      `;
    }
  } catch (err) {
    console.error("writeMatchRecommendations failed:", err);
  }
}

async function fallbackFeed(): Promise<PersonalizedFeed> {
  const trends = await safeTrends();
  let trendingBattles: Awaited<ReturnType<typeof getTrendingBattles>> = [];
  try {
    trendingBattles = await getTrendingBattles(10);
  } catch (err) {
    console.error("fallback trending battles failed:", err);
  }
  const battles: RecommendedBattle[] = trendingBattles.map((battle) => ({
    id: battle.id,
    battle_code: battle.battle_code,
    title: battle.title,
    topic: battle.topic,
    battle_type: battle.battle_type,
    mode: battle.mode,
    status: battle.status,
    rounds: 3,
    created_at: battle.created_at,
    expires_at: null,
    creator_id: battle.creator_id,
    creator_user_id: battle.creator_user_id,
    creator_username: battle.creator_username,
    creator_avatar: battle.creator_avatar,
    creator_aura: 0,
    opponent_id: battle.opponent_id,
    opponent_user_id: battle.opponent_user_id,
    opponent_username: battle.opponent_username,
    opponent_avatar: battle.opponent_avatar,
    matchScore: Math.min(100, Math.max(45, battle.engagement_score)),
    recommendationReason: fallbackReason(battle.topic),
    recommendationType: battle.status === "active" ? "trending" : "new",
  }));

  return {
    generatedAt: new Date().toISOString(),
    cache: "fallback",
    sections: {
      recommendedForYou: section("recommended-for-you", "Recommended For You", battles.slice(0, 6)),
      trendingNow: section("trending-now", "Trending Now", battles.slice(0, 6)),
      newBattles: section("new-battles", "New Battles", battles.filter((battle) => battle.status === "waiting").slice(0, 6)),
      matchingInterests: section("matching-interests", "Battles Matching Your Interests", []),
      improveWeaknesses: section("improve-weaknesses", "Improve Your Weaknesses", []),
      playersToChallenge: section("players-to-challenge", "Players You Should Challenge", []),
      similarPlayers: section("similar-players", "Similar Players", []),
      recentlyActiveOpponents: section("recently-active-opponents", "Recently Active Opponents", []),
      discovery: section("discovery", "Discover Something New", battles.slice(3, 9)),
    },
    trends,
  };
}

async function safeTrends(): Promise<TrendReport> {
  try {
    return await analyzeTrends();
  } catch (err) {
    console.error("safeTrends failed:", err);
    return { generatedAt: new Date().toISOString(), topics: [], styles: [], mostCompetitivePlayers: [] };
  }
}

function section<T>(id: string, title: string, items: T[]): FeedSection<T> {
  return { id, title, items };
}

function mergeTrending(battles: RecommendedBattle[], trends: TrendReport): RecommendedBattle[] {
  if (battles.length > 0) return battles;
  return trends.topics.slice(0, 4).map((trend) => ({
    id: `topic:${trend.topic}`,
    battle_code: "",
    title: `${trend.topic} is ${trend.growthLabel}`,
    topic: trend.topic,
    battle_type: "casual",
    mode: "text",
    status: "trend",
    rounds: 0,
    created_at: trends.generatedAt,
    expires_at: null,
    creator_id: "",
    creator_user_id: "",
    creator_username: "Ragebait",
    creator_avatar: "",
    creator_aura: 0,
    opponent_id: null,
    opponent_user_id: null,
    opponent_username: null,
    opponent_avatar: null,
    matchScore: Math.min(100, trend.score),
    recommendationReason: `${trend.battleCount} battles and ${trend.messageCount} messages in the last 14 days.`,
    recommendationType: "trending",
  }));
}
