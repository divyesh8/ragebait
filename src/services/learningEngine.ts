import { sql } from "@/lib/db";
import type { AdvancedAiReport } from "@/services/advancedAiSystems";
import type { JudgeInput, JudgeResult } from "@/services/aiJudge";

export async function recordBattleLearningEvent(
  input: JudgeInput,
  result: JudgeResult,
  advanced: AdvancedAiReport
) {
  if (!input.battleId) return;

  const winnerId =
    result.winner === "creator"
      ? input.creatorId
      : result.winner === "opponent"
      ? input.opponentId
      : null;
  const loserId =
    result.winner === "creator"
      ? input.opponentId
      : result.winner === "opponent"
      ? input.creatorId
      : null;

  const payload = {
    winner: result.winner,
    winnerId,
    loserId,
    topic: input.topic,
    battleType: input.battleType ?? "casual",
    mode: input.mode ?? "text",
    logicScore: advanced.learningEngine.logicScore,
    humorScore: advanced.learningEngine.humorScore,
    length: advanced.learningEngine.length,
    language: advanced.learningEngine.language,
    aiConfidence: advanced.learningEngine.aiConfidence,
    appealOutcome: advanced.learningEngine.appealOutcome,
    brainVersion: result.brainVersion,
    advancedVersion: advanced.version,
    health: advanced.health,
    selfEvaluation: advanced.selfEvaluation,
  };

  try {
    await sql`
      INSERT INTO ai_battle_learning_events (
        battle_id, winner_id, loser_id, topic, logic_score, humor_score,
        transcript_length, language, ai_confidence, appeal_outcome, payload
      ) VALUES (
        ${input.battleId}, ${winnerId}, ${loserId}, ${input.topic},
        ${advanced.learningEngine.logicScore}, ${advanced.learningEngine.humorScore},
        ${advanced.learningEngine.length}, ${advanced.learningEngine.language},
        ${advanced.learningEngine.aiConfidence}, ${advanced.learningEngine.appealOutcome},
        ${JSON.stringify(payload)}
      )
      ON CONFLICT (battle_id) DO UPDATE SET
        winner_id = EXCLUDED.winner_id,
        loser_id = EXCLUDED.loser_id,
        topic = EXCLUDED.topic,
        logic_score = EXCLUDED.logic_score,
        humor_score = EXCLUDED.humor_score,
        transcript_length = EXCLUDED.transcript_length,
        language = EXCLUDED.language,
        ai_confidence = EXCLUDED.ai_confidence,
        appeal_outcome = EXCLUDED.appeal_outcome,
        payload = EXCLUDED.payload,
        created_at = now()
    `;
  } catch (err) {
    console.warn("Learning event table write skipped:", err);
  }

  try {
    await sql`
      INSERT INTO ai_feedback (battle_id, kind, payload)
      VALUES (${input.battleId}, 'battle_learning', ${JSON.stringify(payload)})
    `;
  } catch (err) {
    console.warn("Learning feedback write skipped:", err);
  }
}
