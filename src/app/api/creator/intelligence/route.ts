import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireCreatorFromRequest } from "@/lib/creator";
import { buildAdvancedAiReport } from "@/services/advancedAiSystems";
import { readRageMindXCreatorTelemetry } from "@/services/ragemind-x/telemetry";

export const dynamic = "force-dynamic";

const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 });

// GET /api/creator/intelligence — founder-only Creator AI Assistant data.
export async function GET(req: NextRequest) {
  const creator = await requireCreatorFromRequest(req);
  if (!creator) return notFound();

  try {
    const [
      suspiciousUsers,
      auraFarmers,
      trendingTopics,
      toxicClusters,
      exploitAttempts,
      recentDecisions,
      feedbackCounts,
      liveBattles,
      learningMetrics,
      rageMindX,
    ] = await Promise.all([
      sql`
        SELECT u.id, u.username,
               COUNT(*) FILTER (WHERE ml.action = 'WARN')::int AS warnings,
               COUNT(*) FILTER (WHERE ml.action = 'BLOCK')::int AS blocks,
               MAX(ml.created_at) AS last_seen
        FROM moderation_logs ml
        JOIN users u ON u.id = ml.user_id
        WHERE ml.created_at > now() - interval '14 days'
        GROUP BY u.id, u.username
        HAVING COUNT(*) FILTER (WHERE ml.action IN ('WARN', 'BLOCK')) >= 3
        ORDER BY blocks DESC, warnings DESC, last_seen DESC
        LIMIT 8
      `,
      sql`
        SELECT u.id, u.username,
               COUNT(*)::int AS transactions,
               COALESCE(SUM(at.amount), 0)::int AS aura_delta,
               COUNT(DISTINCT at.battle_id)::int AS battles
        FROM aura_transactions at
        JOIN users u ON u.id = at.user_id
        WHERE at.created_at > now() - interval '7 days'
        GROUP BY u.id, u.username
        HAVING COUNT(*) >= 5 OR ABS(COALESCE(SUM(at.amount), 0)) >= 250
        ORDER BY ABS(COALESCE(SUM(at.amount), 0)) DESC, transactions DESC
        LIMIT 8
      `,
      sql`
        SELECT topic,
               COUNT(*)::int AS battles,
               COALESCE(SUM(message_count.count), 0)::int AS messages
        FROM battles b
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::int AS count FROM battle_messages bm WHERE bm.battle_id = b.id
        ) message_count ON TRUE
        WHERE b.created_at > now() - interval '3 days'
        GROUP BY topic
        ORDER BY battles DESC, messages DESC
        LIMIT 8
      `,
      sql`
        SELECT b.topic,
               COUNT(*)::int AS moderation_events,
               COUNT(DISTINCT ml.user_id)::int AS users
        FROM moderation_logs ml
        JOIN battles b ON b.id = ml.battle_id
        WHERE ml.created_at > now() - interval '7 days'
          AND ml.action IN ('WARN', 'BLOCK')
        GROUP BY b.topic
        HAVING COUNT(*) >= 2
        ORDER BY moderation_events DESC
        LIMIT 8
      `,
      sql`
        SELECT bm.id, bm.battle_id, u.username, bm.content, bm.created_at
        FROM battle_messages bm
        JOIN users u ON u.id = bm.user_id
        WHERE bm.created_at > now() - interval '14 days'
          AND bm.content ~* '(farm aura|aura farm|exploit|script|botting|copy paste|win trade|boost)'
        ORDER BY bm.created_at DESC
        LIMIT 8
      `,
      sql`
        SELECT b.id, b.title, b.topic, b.winner_id, b.ai_summary, b.ai_scores, b.completed_at,
               creator.username AS creator_username,
               opponent.username AS opponent_username
        FROM battles b
        JOIN users creator ON creator.id = b.created_by
        LEFT JOIN users opponent ON opponent.id = b.opponent_id
        WHERE b.status = 'completed' AND b.completed_at > now() - interval '7 days'
        ORDER BY b.completed_at DESC
        LIMIT 10
      `,
      sql`
        SELECT kind, COUNT(*)::int AS count
        FROM ai_feedback
        WHERE created_at > now() - interval '30 days'
        GROUP BY kind
      `,
      sql`
        SELECT b.id, b.title, b.topic, b.battle_type, b.mode, b.status, b.rounds,
               b.created_at, b.completed_at, b.created_by, b.opponent_id,
               creator.username AS creator_username,
               opponent.username AS opponent_username
        FROM battles b
        JOIN users creator ON creator.id = b.created_by
        LEFT JOIN users opponent ON opponent.id = b.opponent_id
        WHERE b.status IN ('waiting', 'active', 'judging', 'pending_review', 'open', 'live')
        ORDER BY b.created_at DESC
        LIMIT 6
      `,
      readLearningMetrics(),
      readRageMindXCreatorTelemetry(),
    ]);

    const liveStrategy = await buildLiveStrategy(liveBattles as any[]);
    const overturned = Number(feedbackCounts.find((row) => row.kind === "appeal_overturned")?.count ?? 0);
    const upheld = Number(feedbackCounts.find((row) => row.kind === "appeal_upheld")?.count ?? 0);
    const moderationOverrides = Number(feedbackCounts.find((row) => row.kind === "moderation_override")?.count ?? 0);
    const totalAppeals = overturned + upheld;

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      assistant: {
        platformSummary: summarizePlatform(trendingTopics, suspiciousUsers, toxicClusters),
        suspiciousUsers: suspiciousUsers.map((row) => ({
          id: row.id,
          username: row.username,
          warnings: Number(row.warnings ?? 0),
          blocks: Number(row.blocks ?? 0),
          reason: `${Number(row.warnings ?? 0)} warnings and ${Number(row.blocks ?? 0)} blocks in the last 14 days.`,
        })),
        auraFarmers: auraFarmers.map((row) => ({
          id: row.id,
          username: row.username,
          transactions: Number(row.transactions ?? 0),
          auraDelta: Number(row.aura_delta ?? 0),
          battles: Number(row.battles ?? 0),
          reason: "Unusual Aura movement or repeated transactions in a short window.",
        })),
        trendingTopics: trendingTopics.map((row) => ({
          topic: row.topic,
          battles: Number(row.battles ?? 0),
          messages: Number(row.messages ?? 0),
        })),
        playerLosses: recentDecisions.map((row) => ({
          battleId: row.id,
          title: row.title,
          topic: row.topic,
          creator: row.creator_username,
          opponent: row.opponent_username,
          summary: row.ai_summary,
          confidence: Number(row.ai_scores?.advancedSystems?.selfEvaluation?.confidence ?? row.ai_scores?.battleAnalysis?.confidenceScore ?? 0),
        })),
        toxicClusters: toxicClusters.map((row) => ({
          topic: row.topic,
          moderationEvents: Number(row.moderation_events ?? 0),
          users: Number(row.users ?? 0),
        })),
        exploitAttempts: exploitAttempts.map((row) => ({
          messageId: row.id,
          battleId: row.battle_id,
          username: row.username,
          content: String(row.content).slice(0, 180),
          createdAt: row.created_at,
        })),
        liveStrategy,
      },
      continuousImprovement: {
        currentVersion: "advanced-ai-systems-v1.0",
        completedBattlesSampled: learningMetrics.completedBattles,
        averageConfidence: learningMetrics.averageConfidence,
        modelAgreement: estimateAgreement(recentDecisions),
        historicalReplay: recentDecisions.length > 0 ? "Ready" : "Needs judged battles",
        falsePositiveRisk: totalAppeals > 0 ? Math.round((overturned / totalAppeals) * 100) : moderationOverrides > 0 ? 18 : 7,
        falseNegativeRisk: moderationOverrides > 0 ? Math.min(35, 10 + moderationOverrides * 2) : 9,
        abTests: [
          { name: "logic-heavy scoring", status: "available", guardrail: "winner agreement >= 85%" },
          { name: "humor-heavy scoring", status: "available", guardrail: "toxicity false positives do not rise" },
          { name: "strict moderation", status: moderationOverrides > 0 ? "watch" : "available", guardrail: "appeal overturn rate <= 8%" },
        ],
        rollback: {
          ready: true,
          previousVersion: "brain-v2.0",
          reason: "Judge weights remain configurable through ai_rules and can be restored from audit history.",
        },
      },
      rageMindX,
    });
  } catch (err) {
    console.error("Creator intelligence error:", err);
    return NextResponse.json({ error: "Unable to load creator intelligence." }, { status: 500 });
  }
}

async function readLearningMetrics() {
  try {
    const rows = await sql`
      SELECT COUNT(*)::int AS completed_battles,
             COALESCE(ROUND(AVG(ai_confidence))::int, 0) AS average_confidence
      FROM ai_battle_learning_events
      WHERE created_at > now() - interval '30 days'
    `;
    return {
      completedBattles: Number(rows[0]?.completed_battles ?? 0),
      averageConfidence: Number(rows[0]?.average_confidence ?? 0),
    };
  } catch {
    const rows = await sql`
      SELECT COUNT(*)::int AS completed_battles,
             COALESCE(ROUND(AVG(NULLIF(ai_scores->'advancedSystems'->'selfEvaluation'->>'confidence', '')::numeric))::int, 0) AS average_confidence
      FROM battles
      WHERE status = 'completed' AND completed_at > now() - interval '30 days'
    `;
    return {
      completedBattles: Number(rows[0]?.completed_battles ?? 0),
      averageConfidence: Number(rows[0]?.average_confidence ?? 0),
    };
  }
}

async function buildLiveStrategy(liveBattles: any[]) {
  const results = [];
  for (const battle of liveBattles.slice(0, 4)) {
    const messages = await sql`
      SELECT bm.content, bm.round, bm.created_at, bm.user_id, u.username
      FROM battle_messages bm
      JOIN users u ON u.id = bm.user_id
      WHERE bm.battle_id = ${battle.id}
      ORDER BY bm.round ASC, bm.created_at ASC
    `;
    const report = buildAdvancedAiReport({
      battle: {
        id: battle.id,
        title: battle.title,
        topic: battle.topic,
        battleType: battle.battle_type,
        mode: battle.mode,
        rounds: Number(battle.rounds ?? 3),
        status: battle.status,
        createdAt: battle.created_at,
        completedAt: battle.completed_at,
      },
      players: {
        creator: { side: "creator", userId: battle.created_by, username: battle.creator_username },
        opponent: { side: "opponent", userId: battle.opponent_id, username: battle.opponent_username ?? "Opponent" },
      },
      messages: messages.map((message) => ({
        side: message.user_id === battle.created_by ? "creator" : "opponent",
        userId: String(message.user_id),
        username: String(message.username),
        content: String(message.content),
        round: Number(message.round),
        createdAt: message.created_at ? String(message.created_at) : null,
      })),
    });
    results.push({
      battleId: battle.id,
      title: battle.title,
      topic: battle.topic,
      health: report.health,
      strategy: report.strategy,
      directorSynthesis: report.multiAgentBrain.directorSynthesis,
    });
  }
  return results;
}

function summarizePlatform(trendingTopics: any[], suspiciousUsers: any[], toxicClusters: any[]) {
  const topic = trendingTopics[0]?.topic ? `Top topic is ${trendingTopics[0].topic}.` : "No clear topic trend yet.";
  const suspicious = suspiciousUsers.length ? `${suspiciousUsers.length} suspicious user cluster${suspiciousUsers.length === 1 ? "" : "s"} need review.` : "No suspicious user cluster is above threshold.";
  const toxicity = toxicClusters.length ? `${toxicClusters.length} toxic topic cluster${toxicClusters.length === 1 ? "" : "s"} are active.` : "No toxic topic cluster is above threshold.";
  return `${topic} ${suspicious} ${toxicity}`;
}

function estimateAgreement(decisions: any[]): number {
  if (decisions.length === 0) return 0;
  const confident = decisions.filter((row) => {
    const aiScores = row.ai_scores ?? {};
    const confidence = Number(aiScores?.advancedSystems?.selfEvaluation?.confidence ?? aiScores?.battleAnalysis?.confidenceScore ?? 0);
    return confidence >= 65;
  }).length;
  return Math.round((confident / decisions.length) * 100);
}
