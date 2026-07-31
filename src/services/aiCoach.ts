/**
 * AI Coach service — Phase 3.
 *
 * Unlike aiModerator.ts (kept deliberately pure/DB-free), the Coach owns
 * its full pipeline end to end, per the Phase 3 spec: read the battle
 * result, read player history, generate coaching feedback, update
 * PlayerAIProfile, save coaching history. It's the only file that touches
 * `player_ai_profiles` / `player_coach_history`.
 *
 * Completely separate from AI Judge (src/app/api/battles/[id]/judge) and
 * AI Moderator (src/services/aiModerator.ts + src/lib/moderationEnforcement.ts)
 * — no imports between them. The Coach *reads* the Judge's already-saved
 * verdict (battles.ai_scores) rather than re-scoring the battle itself,
 * so winner selection and scoring logic is never duplicated.
 *
 * Only ever invoked after a battle reaches status = 'completed', and is
 * idempotent per (user, battle) — see runAiCoach().
 */

import { sql } from "@/lib/db";

// =========================================================
// Types
// =========================================================

export interface ScoreSet {
  creativity: number;
  logic: number;
  humor: number;
  originality: number;
  comeback: number;
  entertainment: number;
}

export type Playstyle = "Aggressive" | "Strategic" | "Funny" | "Logical" | "Creative" | "Balanced" | "Adaptive";

export interface ProgressionEntry {
  metric: keyof ScoreSet;
  from: number;
  to: number;
}

export interface CoachResult {
  strengths: string[];
  weaknesses: string[];
  repeatedMistakes: string[];
  improvementSuggestions: string[];
  practiceGoal: string;
  coachFeedback: string;
  playstyle: Playstyle;
  scores: ScoreSet;
  /** null the very first time this user is ever coached — no prior average to compare against. */
  progression: ProgressionEntry[] | null;
  profile: {
    totalReviews: number;
    averages: ScoreSet;
    preferredStyle: Playstyle;
    topStrengths: string[];
    topWeaknesses: string[];
  };
  /** true if this replayed a previously-generated report instead of running the AI again. */
  reused: boolean;
}

const METRIC_LABELS: Record<keyof ScoreSet, string> = {
  creativity: "creativity",
  logic: "logical structure",
  humor: "humor",
  originality: "originality",
  comeback: "comeback quality",
  entertainment: "entertainment value",
};

// =========================================================
// Public entry point
// =========================================================

/**
 * Generates (or replays) the AI coaching report for one participant of a
 * completed battle. Safe to call repeatedly — after the first successful
 * run, subsequent calls just return the stored report without invoking
 * the AI again ("run once", enforced both here and by a DB unique
 * constraint on (user_id, battle_id) as a second line of defense against
 * races).
 */
export async function runAiCoach(battleId: string, userId: string): Promise<CoachResult> {
  const existing = await sql`
    SELECT * FROM player_coach_history WHERE user_id = ${userId} AND battle_id = ${battleId} LIMIT 1
  `;
  if (existing.length > 0) {
    const profileRows = await sql`SELECT * FROM player_ai_profiles WHERE user_id = ${userId} LIMIT 1`;
    return buildResultFromExisting(existing[0], profileRows[0] ?? null);
  }

  const battle = await fetchBattleForCoaching(battleId);
  if (!battle) throw new Error("Battle not found.");
  if (battle.status !== "completed") throw new Error("This battle has not been judged yet.");
  if (battle.created_by !== userId && battle.opponent_id !== userId) {
    throw new Error("You are not a participant in this battle.");
  }

  const isCreator = battle.created_by === userId;
  const aiScores = (battle.ai_scores ?? {}) as any;
  const myScores = normalizeScores(isCreator ? aiScores.creator : aiScores.opponent);
  const opponentScores = normalizeScores(isCreator ? aiScores.opponent : aiScores.creator);
  const battleAnalysis = aiScores.battleAnalysis ?? {};
  const myJudgeTip: string | undefined = aiScores.feedback?.[isCreator ? "creator" : "opponent"];

  const messageRows = await sql`
    SELECT user_id, content FROM battle_messages
    WHERE battle_id = ${battleId}
    ORDER BY round ASC, created_at ASC
  `;
  const myMessages = messageRows.filter((r) => r.user_id === userId).map((r) => r.content as string);
  const opponentMessages = messageRows.filter((r) => r.user_id !== userId).map((r) => r.content as string);
  const repeatedFlags = detectRepeatedPhrasing(myMessages);

  const profileRows = await sql`SELECT * FROM player_ai_profiles WHERE user_id = ${userId} LIMIT 1`;
  const priorProfile = profileRows[0] ?? null;
  const priorAverages = priorProfile ? extractAverages(priorProfile) : null;

  const won = battle.winner_id === userId;
  const lost = Boolean(battle.winner_id) && battle.winner_id !== userId;

  // Fully self-developed AI: coaching is derived deterministically from the
  // judge's scores and detected repetition — no external AI services.
  const coaching: CoachingText = fallbackCoaching({ myScores, repeatedFlags, won, lost });

  const updatedProfile = await upsertPlayerProfile(userId, myScores, battle.topic, priorProfile);
  const progression = priorAverages ? diffScores(priorAverages, updatedProfile.averages) : null;

  const inserted = await sql`
    INSERT INTO player_coach_history (
      user_id, battle_id, strengths, weaknesses, repeated_mistakes, improvement_suggestions,
      coach_feedback, practice_goal, scores, playstyle, progression
    ) VALUES (
      ${userId}, ${battleId}, ${JSON.stringify(coaching.strengths)}, ${JSON.stringify(coaching.weaknesses)},
      ${JSON.stringify(coaching.repeatedMistakes)}, ${JSON.stringify(coaching.improvementSuggestions)},
      ${coaching.coachFeedback}, ${coaching.practiceGoal}, ${JSON.stringify(myScores)}, ${updatedProfile.preferredStyle},
      ${progression ? JSON.stringify(progression) : null}
    )
    ON CONFLICT (user_id, battle_id) DO NOTHING
    RETURNING *
  `;

  if (inserted.length === 0) {
    // Lost a race to a concurrent request for the same (user, battle) —
    // the other request's insert won, so just replay what it wrote rather
    // than generating (and paying for) a second AI report.
    const raceRow = await sql`
      SELECT * FROM player_coach_history WHERE user_id = ${userId} AND battle_id = ${battleId} LIMIT 1
    `;
    const raceProfile = await sql`SELECT * FROM player_ai_profiles WHERE user_id = ${userId} LIMIT 1`;
    return buildResultFromExisting(raceRow[0], raceProfile[0] ?? null);
  }

  return {
    strengths: coaching.strengths,
    weaknesses: coaching.weaknesses,
    repeatedMistakes: coaching.repeatedMistakes,
    improvementSuggestions: coaching.improvementSuggestions,
    practiceGoal: coaching.practiceGoal,
    coachFeedback: coaching.coachFeedback,
    playstyle: updatedProfile.preferredStyle,
    scores: myScores,
    progression,
    profile: {
      totalReviews: updatedProfile.totalReviews,
      averages: updatedProfile.averages,
      preferredStyle: updatedProfile.preferredStyle,
      topStrengths: updatedProfile.strengths,
      topWeaknesses: updatedProfile.weaknesses,
    },
    reused: false,
  };
}

function buildResultFromExisting(row: any, profileRow: any): CoachResult {
  return {
    strengths: row.strengths ?? [],
    weaknesses: row.weaknesses ?? [],
    repeatedMistakes: row.repeated_mistakes ?? [],
    improvementSuggestions: row.improvement_suggestions ?? [],
    practiceGoal: row.practice_goal ?? "",
    coachFeedback: row.coach_feedback ?? "",
    playstyle: (row.playstyle ?? "Balanced") as Playstyle,
    scores: row.scores ?? { creativity: 0, logic: 0, humor: 0, originality: 0, comeback: 0, entertainment: 0 },
    progression: row.progression ?? null,
    profile: {
      totalReviews: profileRow?.total_ai_reviews ?? 0,
      averages: profileRow ? extractAverages(profileRow) : row.scores,
      preferredStyle: (profileRow?.preferred_battle_style ?? row.playstyle ?? "Balanced") as Playstyle,
      topStrengths: profileRow?.strengths ?? [],
      topWeaknesses: profileRow?.weaknesses ?? [],
    },
    reused: true,
  };
}

async function fetchBattleForCoaching(battleId: string) {
  const rows = await sql`
    SELECT id, status, topic, battle_type, mode, created_by, opponent_id, winner_id, ai_scores
    FROM battles
    WHERE id = ${battleId}
      AND battle_source = 'PLAYER_VS_PLAYER'
      AND is_ai_generated = FALSE
    LIMIT 1
  `;
  return rows[0] ?? null;
}

// =========================================================
// Score helpers
// =========================================================

function normalizeScores(raw: any): ScoreSet {
  const num = (v: unknown) => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0;
  };
  return {
    creativity: num(raw?.creativity),
    logic: num(raw?.logic),
    humor: num(raw?.humor),
    originality: num(raw?.originality),
    comeback: num(raw?.comeback),
    entertainment: num(raw?.entertainment),
  };
}

function extractAverages(row: any): ScoreSet {
  return {
    creativity: Number(row.average_creativity) || 0,
    logic: Number(row.average_logic) || 0,
    humor: Number(row.average_humor) || 0,
    originality: Number(row.average_originality) || 0,
    comeback: Number(row.average_comeback) || 0,
    entertainment: Number(row.average_entertainment) || 0,
  };
}

function diffScores(from: ScoreSet, to: ScoreSet): ProgressionEntry[] {
  return (Object.keys(to) as (keyof ScoreSet)[]).map((metric) => ({
    metric,
    from: from[metric],
    to: to[metric],
  }));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// =========================================================
// Repeated-mistake detection (local heuristic, no AI needed)
// =========================================================

function detectRepeatedPhrasing(messages: string[]): string[] {
  const notes: string[] = [];
  const normalized = messages.map((m) => m.trim().toLowerCase());
  for (let i = 0; i < normalized.length && notes.length < 3; i++) {
    for (let j = i + 1; j < normalized.length && notes.length < 3; j++) {
      if (commonPrefixLength(normalized[i], normalized[j]) >= 12) {
        notes.push(`Round ${i + 1} and round ${j + 1} open with nearly identical phrasing — try a fresh angle each round.`);
      }
    }
  }
  return notes;
}

function commonPrefixLength(a: string, b: string): number {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}

// =========================================================
// Playstyle detection (deterministic, from cumulative averages)
//
// Kept as a pure heuristic: playstyle should be
// stable across battles, not subject to per-call AI variance, and should
// still work even when the AI Coach's generative pass falls back.
// =========================================================

function detectPlaystyle(averages: ScoreSet, volatility: number): Playstyle {
  const values = Object.values(averages);
  const spread = Math.max(...values) - Math.min(...values);

  // Style has swung significantly from this player's established
  // baseline — call it out as "Adaptive" rather than forcing a bucket.
  if (volatility > 18) return "Adaptive";
  // All six metrics are close together — no dominant trait.
  if (spread < 8) return "Balanced";

  const buckets: Record<"Aggressive" | "Logical" | "Funny" | "Creative" | "Strategic", number> = {
    Aggressive: averages.comeback,
    Logical: averages.logic,
    Funny: averages.humor,
    Creative: (averages.creativity + averages.originality) / 2,
    Strategic: averages.entertainment,
  };
  return (Object.entries(buckets) as [Playstyle, number][]).sort((a, b) => b[1] - a[1])[0][0];
}

function deriveTopTraits(averages: ScoreSet): { topStrengths: string[]; topWeaknesses: string[] } {
  const sorted = (Object.entries(averages) as [keyof ScoreSet, number][]).sort((a, b) => b[1] - a[1]);
  return {
    topStrengths: sorted.slice(0, 2).map(([k]) => METRIC_LABELS[k]),
    topWeaknesses: sorted.slice(-2).map(([k]) => METRIC_LABELS[k]),
  };
}

function mergeFavoriteTopics(existing: unknown, topic: string): { topic: string; count: number }[] {
  const list: { topic: string; count: number }[] = Array.isArray(existing) ? (existing as any[]) : [];
  const idx = list.findIndex((t) => t.topic.toLowerCase() === topic.toLowerCase());
  const next = [...list];
  if (idx >= 0) next[idx] = { topic: next[idx].topic, count: next[idx].count + 1 };
  else next.push({ topic, count: 1 });
  return next.sort((a, b) => b.count - a.count).slice(0, 10);
}

// =========================================================
// PlayerAIProfile — cumulative update, never overwritten wholesale
// =========================================================

interface UpdatedProfile {
  totalReviews: number;
  averages: ScoreSet;
  preferredStyle: Playstyle;
  strengths: string[];
  weaknesses: string[];
}

async function upsertPlayerProfile(
  userId: string,
  battleScores: ScoreSet,
  topic: string,
  prior: any | null
): Promise<UpdatedProfile> {
  const priorCount = prior?.total_ai_reviews ?? 0;
  const newCount = priorCount + 1;
  const priorAverages = prior ? extractAverages(prior) : null;

  const averages: ScoreSet = {
    creativity: round2(((priorAverages?.creativity ?? 0) * priorCount + battleScores.creativity) / newCount),
    logic: round2(((priorAverages?.logic ?? 0) * priorCount + battleScores.logic) / newCount),
    humor: round2(((priorAverages?.humor ?? 0) * priorCount + battleScores.humor) / newCount),
    originality: round2(((priorAverages?.originality ?? 0) * priorCount + battleScores.originality) / newCount),
    comeback: round2(((priorAverages?.comeback ?? 0) * priorCount + battleScores.comeback) / newCount),
    entertainment: round2(((priorAverages?.entertainment ?? 0) * priorCount + battleScores.entertainment) / newCount),
  };

  // How far this single battle's raw scores sit from the *prior* running
  // average — a proxy for "has this player's style been shifting lately".
  // Only meaningful once there's a real baseline (3+ prior reviews).
  const volatility =
    priorAverages && priorCount >= 3
      ? (Object.keys(averages) as (keyof ScoreSet)[]).reduce(
          (sum, k) => sum + Math.abs(battleScores[k] - priorAverages[k]),
          0
        ) / 6
      : 0;

  const preferredStyle = detectPlaystyle(averages, volatility);
  const { topStrengths, topWeaknesses } = deriveTopTraits(averages);
  const favoriteTopics = mergeFavoriteTopics(prior?.favorite_topics, topic);

  const rows = await sql`
    INSERT INTO player_ai_profiles (
      user_id, preferred_battle_style, favorite_topics, strengths, weaknesses,
      average_creativity, average_logic, average_humor, average_originality, average_comeback, average_entertainment,
      total_ai_reviews, last_updated
    ) VALUES (
      ${userId}, ${preferredStyle}, ${JSON.stringify(favoriteTopics)}, ${JSON.stringify(topStrengths)}, ${JSON.stringify(topWeaknesses)},
      ${averages.creativity}, ${averages.logic}, ${averages.humor}, ${averages.originality}, ${averages.comeback}, ${averages.entertainment},
      ${newCount}, now()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      preferred_battle_style = EXCLUDED.preferred_battle_style,
      favorite_topics        = EXCLUDED.favorite_topics,
      strengths               = EXCLUDED.strengths,
      weaknesses               = EXCLUDED.weaknesses,
      average_creativity      = EXCLUDED.average_creativity,
      average_logic            = EXCLUDED.average_logic,
      average_humor            = EXCLUDED.average_humor,
      average_originality     = EXCLUDED.average_originality,
      average_comeback        = EXCLUDED.average_comeback,
      average_entertainment   = EXCLUDED.average_entertainment,
      total_ai_reviews        = EXCLUDED.total_ai_reviews,
      last_updated             = now()
    RETURNING total_ai_reviews
  `;

  return {
    totalReviews: rows[0]?.total_ai_reviews ?? newCount,
    averages,
    preferredStyle,
    strengths: topStrengths,
    weaknesses: topWeaknesses,
  };
}

// =========================================================
// Local coaching text generation
// =========================================================

interface CoachingText {
  strengths: string[];
  weaknesses: string[];
  repeatedMistakes: string[];
  improvementSuggestions: string[];
  practiceGoal: string;
  coachFeedback: string;
}

function fallbackCoaching(input: {
  myScores: ScoreSet;
  repeatedFlags: string[];
  won: boolean;
  lost: boolean;
}): CoachingText {
  const sorted = (Object.entries(input.myScores) as [keyof ScoreSet, number][]).sort((a, b) => b[1] - a[1]);
  const top2 = sorted.slice(0, 2);
  const bottom2 = sorted.slice(-2);

  const strengths = top2.map(([k, v]) => `Strong ${METRIC_LABELS[k]} this battle (scored ${v}/100).`);
  const weaknesses = bottom2.map(([k, v]) => `${capitalize(METRIC_LABELS[k])} has room to grow (scored ${v}/100).`);
  const improvementSuggestions = [
    ...bottom2.map(([k]) => `Focus on ${METRIC_LABELS[k]} in your next battle.`),
    "Vary your phrasing so consecutive roasts don't feel repetitive.",
  ].slice(0, 3);
  const practiceGoal = `Push your ${METRIC_LABELS[bottom2[0][0]]} score above ${Math.min(100, bottom2[0][1] + 10)} next battle.`;

  const coachFeedback = input.won
    ? `You won this one — your ${METRIC_LABELS[top2[0][0]]} carried the battle. Keep sharpening ${METRIC_LABELS[bottom2[0][0]]} to make the next win even more decisive.`
    : input.lost
    ? `This one didn't go your way, but your ${METRIC_LABELS[top2[0][0]]} was a real strength. Tightening up ${METRIC_LABELS[bottom2[0][0]]} is the fastest path to a win next time.`
    : `A close, even battle. Your ${METRIC_LABELS[top2[0][0]]} stood out — work on ${METRIC_LABELS[bottom2[0][0]]} to tip things in your favor.`;

  return {
    strengths,
    weaknesses,
    repeatedMistakes: input.repeatedFlags,
    improvementSuggestions,
    practiceGoal,
    coachFeedback: `${coachFeedback} This report was generated locally from your judge scores and repetition patterns.`,
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
