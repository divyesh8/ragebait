import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { runConversationalAiJudge, type JudgeResult } from "@/services/aiJudge";

const AURA_WIN = 100;
const AURA_LOSS = -15;
// A win is "dominant" if the winning score beats the losing score by this much
// (same +100, but labelled differently in the Aura history).
const DOMINANT_MARGIN = 20;

// Performance bonuses — awarded to EITHER player (winner or loser) whose
// judge score clears the bar, so a losing player's best moment still pays.
const BONUS_SCORE_THRESHOLD = 85;
const AURA_STRONG_COMEBACK = 20;
const AURA_CREATIVE_ARGUMENT = 20;
const AURA_EXCELLENT_HUMOR = 15;
const AURA_AUDIENCE_FAVORITE = 25; // only one player can be the audience favorite

// Post-battle participation enforcement: a participation score below this
// means the judge saw repeated spam/nonsense/unrelated messages.
const LOW_PARTICIPATION_THRESHOLD = 40;
const AURA_LOW_PARTICIPATION = -25;
// When exactly one side failed to participate, that penalty transfers to the
// player who kept the battle alive.
const AURA_PARTICIPATION_TRANSFER = 25;

// POST /api/battles/:id/judge — run the AI judge on a battle that's ready
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = params;

  try {
    const battleRows = await sql`
      SELECT b.id, b.title, b.topic, b.status, b.rounds, b.battle_type, b.mode,
             b.created_by, b.opponent_id,
             creator.username AS creator_username,
             opponent.username AS opponent_username
      FROM battles b
      JOIN users creator ON creator.id = b.created_by
      LEFT JOIN users opponent ON opponent.id = b.opponent_id
      WHERE b.id = ${id}
        AND b.battle_source = 'PLAYER_VS_PLAYER'
        AND b.battle_visibility = 'PUBLIC'
        AND b.hidden_from_players = FALSE
        AND b.is_ai_generated = FALSE
      LIMIT 1
    `;

    if (battleRows.length === 0) {
      return NextResponse.json({ error: "Battle not found." }, { status: 404 });
    }

    const battle = battleRows[0];

    if (battle.created_by !== session.userId && battle.opponent_id !== session.userId) {
      return NextResponse.json({ error: "You are not a participant in this battle." }, { status: 403 });
    }

    if (battle.status === "completed") {
      return NextResponse.json({ error: "This battle has already been judged." }, { status: 409 });
    }

    if (battle.status !== "judging" && battle.status !== "pending_review") {
      return NextResponse.json(
        { error: "This battle isn't ready for judging yet. Both participants must finish all rounds first." },
        { status: 409 }
      );
    }

    if (!battle.opponent_id) {
      return NextResponse.json({ error: "This battle has no opponent." }, { status: 409 });
    }

    const messageRows = await sql`
      SELECT user_id, content, round, created_at
      FROM battle_messages
      WHERE battle_id = ${id}
      ORDER BY round ASC, created_at ASC
    `;

    if (messageRows.length === 0) {
      return NextResponse.json({ error: "This battle has no messages to judge yet." }, { status: 409 });
    }

    let judgeResult: JudgeResult;

    try {
      judgeResult = await runConversationalAiJudge({
        battleId: id,
        topic: battle.topic,
        title: battle.title,
        battleType: battle.battle_type,
        mode: battle.mode,
        creatorId: battle.created_by,
        opponentId: battle.opponent_id,
        creatorName: battle.creator_username,
        opponentName: battle.opponent_username,
        messages: messageRows.map((m) => ({
          user_id: String(m.user_id),
          content: String(m.content),
          round: Number(m.round),
          created_at: m.created_at ? String(m.created_at) : undefined,
        })),
      });
    } catch (aiErr) {
      // Local judging failed unexpectedly. Don't leave the battle stuck in
      // "judging" forever or silently 500 — park it
      // for a retry pass so it's easy to find and re-run later.
      console.error("Local AI judge failed, marking battle for review:", aiErr);
      await sql`
        UPDATE battles SET status = 'pending_review'
        WHERE id = ${id}
          AND battle_source = 'PLAYER_VS_PLAYER'
      `;
      return NextResponse.json(
        {
          error: "The AI judge couldn't reach a verdict right now. This battle has been queued for review — try again shortly.",
          status: "pending_review",
        },
        { status: 202 }
      );
    }

    const result = await saveJudgeResult(id, battle as { created_by: string; opponent_id: string }, judgeResult);
    return NextResponse.json(result);
  } catch (err) {
    console.error("AI judge error:", err);
    return NextResponse.json({ error: "Something went wrong while judging the battle." }, { status: 500 });
  }
}

// =========================================================
// Persist result + apply Aura/stat changes
// =========================================================

async function saveJudgeResult(
  battleId: string,
  battle: { created_by: string; opponent_id: string },
  judgeResult: JudgeResult
) {
  const winnerId =
    judgeResult.winner === "creator"
      ? battle.created_by
      : judgeResult.winner === "opponent"
      ? battle.opponent_id
      : null;

  const creatorTotal = judgeResult.scores.creator?.total ?? 0;
  const opponentTotal = judgeResult.scores.opponent?.total ?? 0;
  const margin = Math.abs(creatorTotal - opponentTotal);

  // ai_scores stores everything the verdict card needs in one JSONB blob:
  // per-player scores, the qualitative battle analysis, and per-player
  // feedback. ai_summary stays a plain-text column holding the short,
  // headline AI verdict (fast to read without parsing JSON).
  const aiScoresPayload = {
    creator: judgeResult.scores.creator,
    opponent: judgeResult.scores.opponent,
    battleAnalysis: judgeResult.battleAnalysis,
    feedback: judgeResult.feedback,
    rageMind: (judgeResult as any).rageMind ?? null,
    advancedSystems: judgeResult.advancedSystems ?? null,
    brainVersion: judgeResult.brainVersion ?? null,
    panel: judgeResult.panel ?? null,
  };

  await sql`
    UPDATE battles
    SET status = 'completed',
        winner_id = ${winnerId},
        ai_summary = ${judgeResult.aiVerdict},
        ai_scores = ${JSON.stringify(aiScoresPayload)},
        completed_at = now()
    WHERE id = ${battleId}
      AND battle_source = 'PLAYER_VS_PLAYER'
  `;

  if (winnerId) {
    const loserId = winnerId === battle.created_by ? battle.opponent_id : battle.created_by;
    const winnerIsDominant = margin >= DOMINANT_MARGIN;

    await applyAuraChange(winnerId, AURA_WIN, winnerIsDominant ? "Dominant Win" : "Battle Win", battleId);
    await applyAuraChange(loserId, AURA_LOSS, "Battle Loss", battleId);

    await sql`
      UPDATE users SET wins = wins + 1,
        current_streak = current_streak + 1,
        best_streak = GREATEST(best_streak, current_streak + 1)
      WHERE id = ${winnerId}
    `;
    await sql`
      UPDATE users SET losses = losses + 1, current_streak = 0
      WHERE id = ${loserId}
    `;
  } else {
    // Draw — small participation Aura for both, no streak changes.
    await applyAuraChange(battle.created_by, 5, "Battle Draw", battleId);
    await applyAuraChange(battle.opponent_id, 5, "Battle Draw", battleId);
  }

  await applyPerformanceBonuses(battleId, battle, judgeResult);
  await applyParticipationEnforcement(battleId, battle, judgeResult);

  return {
    success: true,
    winnerId,
    aiVerdict: judgeResult.aiVerdict,
    scores: {
      creator: judgeResult.scores.creator,
      opponent: judgeResult.scores.opponent,
    },
    battleAnalysis: judgeResult.battleAnalysis,
    feedback: judgeResult.feedback,
    advancedSystems: judgeResult.advancedSystems ?? null,
  };
}

/**
 * Skill-based Aura bonuses from the judge's per-category scores. Both players
 * are eligible regardless of who won — the Aura system rewards quality, not
 * just victory. "Audience Favorite" is exclusive: it needs a clear margin
 * over the other player, so at most one side can earn it.
 */
async function applyPerformanceBonuses(
  battleId: string,
  battle: { created_by: string; opponent_id: string },
  judgeResult: JudgeResult
) {
  const sides = [
    { userId: battle.created_by, score: judgeResult.scores.creator, other: judgeResult.scores.opponent },
    { userId: battle.opponent_id, score: judgeResult.scores.opponent, other: judgeResult.scores.creator },
  ];

  for (const { userId, score, other } of sides) {
    if ((score.comeback ?? 0) >= BONUS_SCORE_THRESHOLD) {
      await applyAuraChange(userId, AURA_STRONG_COMEBACK, "Strong Comeback", battleId);
    }
    if ((score.creativity ?? 0) >= BONUS_SCORE_THRESHOLD) {
      await applyAuraChange(userId, AURA_CREATIVE_ARGUMENT, "Creative Argument", battleId);
    }
    if ((score.humor ?? 0) >= BONUS_SCORE_THRESHOLD) {
      await applyAuraChange(userId, AURA_EXCELLENT_HUMOR, "Excellent Humor", battleId);
    }
    if ((score.audienceImpact ?? 0) >= BONUS_SCORE_THRESHOLD && (score.audienceImpact ?? 0) > (other.audienceImpact ?? 0)) {
      await applyAuraChange(userId, AURA_AUDIENCE_FAVORITE, "Audience Favorite", battleId);
    }
  }
}

/**
 * Post-battle enforcement of the participation rules: a player the judge
 * marked as non-participating (repeated spam/nonsense/unrelated messages)
 * loses Aura, and when only one side went AFK the penalty transfers to the
 * player who kept battling. Missing participation scores default to 70 in
 * the judge service, so this never fires on incomplete AI output.
 */
async function applyParticipationEnforcement(
  battleId: string,
  battle: { created_by: string; opponent_id: string },
  judgeResult: JudgeResult
) {
  const creatorLow = (judgeResult.scores.creator.participation ?? 70) < LOW_PARTICIPATION_THRESHOLD;
  const opponentLow = (judgeResult.scores.opponent.participation ?? 70) < LOW_PARTICIPATION_THRESHOLD;
  if (!creatorLow && !opponentLow) return;

  if (creatorLow) {
    await applyAuraChange(battle.created_by, AURA_LOW_PARTICIPATION, "Low Participation", battleId);
  }
  if (opponentLow) {
    await applyAuraChange(battle.opponent_id, AURA_LOW_PARTICIPATION, "Low Participation", battleId);
  }
  if (creatorLow !== opponentLow) {
    const activePlayer = creatorLow ? battle.opponent_id : battle.created_by;
    await applyAuraChange(activePlayer, AURA_PARTICIPATION_TRANSFER, "Aura Transfer: Opponent Low Participation", battleId);
  }
}

async function applyAuraChange(userId: string, amount: number, reason: string, battleId: string) {
  await sql`UPDATE users SET aura = GREATEST(aura + ${amount}, 0) WHERE id = ${userId}`;
  await sql`
    INSERT INTO aura_transactions (user_id, amount, reason, battle_id)
    VALUES (${userId}, ${amount}, ${reason}, ${battleId})
  `;
}
