import {
  analyzeWithRageMind,
  RageMindInput,
  RageMindMessage,
  RageMindReport,
  updateRageMindMemory,
} from "@/services/rageMind";
import { getJudgeWeights } from "@/services/ruleEngine";
import {
  BRAIN_VERSION,
  buildConversationGraph,
  runJudgePanel,
  type PanelResult,
  type SideGraphStats,
} from "@/services/brainV2";
import { buildAdvancedAiReport, type AdvancedAiReport } from "@/services/advancedAiSystems";
import { recordBattleLearningEvent } from "@/services/learningEngine";
import { buildPassThroughFusion, type FusionTrace } from "@/services/ragemind-x/scoreFusion";

export interface JudgeScore {
  creativity: number;
  logic: number;
  humor: number;
  originality: number;
  comeback: number;
  entertainment: number;
  relevance?: number;
  counterarguments?: number;
  consistency?: number;
  adaptability?: number;
  confidence?: number;
  audienceImpact?: number;
  topicAdherence?: number;
  conversationFlow?: number;
  /**
   * How consistently the player posted relevant, on-topic replies across the
   * battle. Low (<40) only for repeated random text, spam, copy-paste,
   * nonsense, emoji spam, or unrelated messages — the judge route uses this
   * to apply post-battle Aura reductions/transfers for non-participation.
   */
  participation?: number;
  total: number;
}

export interface BattleAnalysis {
  strongestArgument: string;
  weakestArgument: string;
  turningPoint: string;
  bestComeback: string;
  finalSummary: string;
  funniestMoment?: string;
  mostCreativeLine?: string;
  overallBattleQuality?: number;
  confidenceScore?: number;
  extremelyClose?: boolean;
  evidence?: string[];
  alternativeInterpretation?: string;
}

export interface JudgeResult {
  scores: Record<"creator" | "opponent", JudgeScore>;
  winner: "creator" | "opponent" | "draw";
  battleAnalysis: BattleAnalysis;
  aiVerdict: string;
  feedback: Record<"creator" | "opponent", string>;
  rageMind?: RageMindReport;
  advancedSystems?: AdvancedAiReport;
  /** Which brain version judged this battle — stored with every result. */
  brainVersion?: string;
  /** Multi-judge panel breakdown (final totals are the panel average). */
  panel?: PanelResult;
  /**
   * Score Fusion Layer trace (Phase 1: pass-through / identity). Records the
   * provenance of every category value. Does not affect the winner in Phase 1 —
   * it exists to prove observability + traceability before RageMind modules are
   * allowed to influence verdicts in later phases.
   */
  fusion?: FusionTrace;
}

export interface JudgeInput {
  battleId?: string;
  topic: string;
  title: string;
  battleType?: string;
  mode?: string;
  creatorId: string;
  opponentId: string;
  creatorName: string;
  opponentName: string;
  messages: {
    user_id: string;
    content: string;
    round: number;
    created_at?: string;
  }[];
}

const WEIGHTS: Record<string, Record<string, number>> = {
  roast: {
    humor: 1.45,
    originality: 1.35,
    creativity: 1.25,
    comeback: 1.2,
    audienceImpact: 1.3,
    logic: 0.65,
    relevance: 0.9,
    conversationFlow: 1,
  },
  debate: {
    logic: 1.55,
    counterarguments: 1.35,
    consistency: 1.2,
    relevance: 1.2,
    topicAdherence: 1.15,
    humor: 0.55,
    originality: 0.85,
    confidence: 1,
  },
  prediction: {
    logic: 1.35,
    confidence: 1.2,
    consistency: 1.2,
    relevance: 1.2,
    counterarguments: 1.1,
    creativity: 0.75,
    humor: 0.45,
  },
  meme: {
    creativity: 1.45,
    originality: 1.35,
    audienceImpact: 1.4,
    humor: 1.25,
    relevance: 0.95,
    logic: 0.45,
  },
  mixed: {
    creativity: 1,
    logic: 1,
    humor: 1,
    originality: 1,
    comeback: 1,
    entertainment: 1,
    relevance: 1,
    conversationFlow: 1,
  },
};

export async function runConversationalAiJudge(input: JudgeInput): Promise<JudgeResult> {
  const rageMindInput = toRageMindInput(input);
  const [rageMind, ruleWeights] = await Promise.all([
    analyzeWithRageMind(rageMindInput),
    getJudgeWeights(),
  ]);
  // Rule engine: founder-tuned weights from ai_rules override the built-in
  // defaults so scoring is adjustable without code changes.
  if (ruleWeights) {
    for (const [style, weights] of Object.entries(ruleWeights)) {
      WEIGHTS[style] = weights;
    }
  }

  // Fully self-developed AI: the judge runs entirely on local RageMind
  // heuristics — no external AI services, no API keys, every score
  // explainable from the transcript.
  const result: JudgeResult = fallbackJudge(input, rageMind);

  result.rageMind = rageMind;
  result.advancedSystems = buildAdvancedForJudge(input, result);
  await recordBattleLearningEvent(input, result, result.advancedSystems);
  await updateRageMindMemory(rageMindInput, rageMind);
  return result;
}

function toRageMindInput(input: JudgeInput): RageMindInput {
  const messages: RageMindMessage[] = input.messages.map((m) => {
    const isCreator = m.user_id === input.creatorId;
    return {
      side: isCreator ? "creator" : "opponent",
      userId: m.user_id,
      username: isCreator ? input.creatorName : input.opponentName,
      content: m.content,
      round: m.round,
      createdAt: m.created_at,
    };
  });

  return {
    battleId: input.battleId,
    title: input.title,
    topic: input.topic,
    battleType: input.battleType,
    mode: input.mode,
    players: [
      { side: "creator", userId: input.creatorId, username: input.creatorName },
      { side: "opponent", userId: input.opponentId, username: input.opponentName },
    ],
    messages,
  };
}

function weightedTotal(score: JudgeScore, style: string): number {
  const weights = WEIGHTS[style] ?? WEIGHTS.mixed;
  let weighted = 0;
  let totalWeight = 0;
  for (const [key, weight] of Object.entries(weights)) {
    const value = Number((score as any)[key]);
    if (Number.isFinite(value)) {
      weighted += value * weight;
      totalWeight += weight;
    }
  }
  if (!totalWeight) {
    return Math.round((score.creativity + score.logic + score.humor + score.originality + score.comeback + score.entertainment) / 6);
  }
  return clampScore(weighted / totalWeight);
}

/** Exposed for the self-test framework — judges without touching memory or cache. */
export function judgeWithLocalBrain(input: JudgeInput, rageMind: RageMindReport): JudgeResult {
  return fallbackJudge(input, rageMind);
}

/** Self-test helper: full local pipeline (RageMind + judge), no battleId → no cache/memory writes. */
/**
 * Core evaluation primitive: runs the FULL judge pipeline (RageMind →
 * conversation graph → judge panel) on any transcript, with no battleId so
 * nothing is cached or written to player memory. This is the single source
 * of truth shared by the final judge, the live Battle Engine momentum, and
 * the self-test framework — there is deliberately no second evaluator.
 */
export async function evaluateBattleTranscript(input: JudgeInput): Promise<JudgeResult> {
  const rageMind = await analyzeWithRageMind(toRageMindInput({ ...input, battleId: undefined }));
  return fallbackJudge(input, rageMind);
}

/** @deprecated Renamed — use {@link evaluateBattleTranscript}. Kept so existing callers keep compiling. */
export const selfTestJudge = evaluateBattleTranscript;

function fallbackJudge(input: JudgeInput, rageMind: RageMindReport): JudgeResult {
  const creatorMessages = input.messages.filter((m) => m.user_id === input.creatorId).map((m) => m.content);
  const opponentMessages = input.messages.filter((m) => m.user_id === input.opponentId).map((m) => m.content);
  const creator = scoreMessages(creatorMessages, rageMind, "creator");
  const opponent = scoreMessages(opponentMessages, rageMind, "opponent");

  // Brain v2 conversation graph: counters, callbacks, reused jokes, and
  // unanswered attacks adjust the category scores before the panel votes.
  const graph = buildConversationGraph(
    input.messages.map((m) => ({
      side: m.user_id === input.creatorId ? ("creator" as const) : ("opponent" as const),
      content: m.content,
      round: m.round,
    }))
  );
  applyGraphAdjustments(creator, graph.perSide.creator, rageMind.battleStyle);
  applyGraphAdjustments(opponent, graph.perSide.opponent, rageMind.battleStyle);

  // Multi-judge panel: five personas + the rule-weighted style judge.
  // The final score for each side is the average across all judges.
  const panel = runJudgePanel(creator as any, opponent as any);
  creator.total = panel.average.creator;
  opponent.total = panel.average.opponent;

  const winner = Math.abs(creator.total - opponent.total) <= 2 ? "draw" : creator.total > opponent.total ? "creator" : "opponent";
  const winnerName = winner === "creator" ? input.creatorName : winner === "opponent" ? input.opponentName : null;
  const strongestSide = creator.total >= opponent.total ? "creator" : "opponent";
  const strongestName = strongestSide === "creator" ? input.creatorName : input.opponentName;
  const strongestMsgs = strongestSide === "creator" ? creatorMessages : opponentMessages;
  const weakestName = strongestSide === "creator" ? input.opponentName : input.creatorName;
  const weakestMsgs = strongestSide === "creator" ? opponentMessages : creatorMessages;

  return {
    scores: { creator, opponent },
    winner,
    battleAnalysis: {
      strongestArgument: `${strongestName}: "${truncate(bestLine(strongestMsgs), 180)}"`,
      weakestArgument: `${weakestName}: "${truncate(worstLine(weakestMsgs), 180)}"`,
      turningPoint: rageMind.contextEngine.momentumShifts[0] ?? "No single turning point was clear.",
      bestComeback: rageMind.audienceSimulation.mostSavageComeback || `${strongestName}: "${truncate(bestLine(strongestMsgs), 180)}"`,
      funniestMoment: rageMind.audienceSimulation.biggestLaugh,
      mostCreativeLine: rageMind.audienceSimulation.mostShareableLine,
      overallBattleQuality: Math.round((creator.total + opponent.total) / 2),
      confidenceScore: rageMind.confidence.score,
      extremelyClose: rageMind.confidence.score < 70 || Math.abs(creator.total - opponent.total) <= 4,
      evidence: [
        panel.summary,
        ...graph.insights.slice(0, 3),
        rageMind.contextEngine.conversationFlow,
        rageMind.reasoningEngine.reasoning,
        ...rageMind.slangEngine.interpretations.slice(0, 2),
        ...rageMind.fairnessEngine.biasWarnings.slice(0, 1),
      ].filter(Boolean).slice(0, 8),
      alternativeInterpretation: rageMind.confidence.alternativeInterpretation,
      finalSummary:
        winner === "draw"
          ? `${input.creatorName} and ${input.opponentName} were close across the full conversation, with neither side creating enough separation.`
          : `${winnerName} edged the battle by landing stronger context-aware replies and better audience impact across the transcript.`,
    },
    aiVerdict:
      winner === "draw"
        ? `${input.creatorName} and ${input.opponentName} finish in a draw after a closely matched exchange.`
        : `${winnerName} wins on fuller conversation control, stronger timing, and better audience impact.`,
    feedback: {
      creator: "Keep the best lines tied to the opponent's previous point so the battle feels more adaptive.",
      opponent: "Push for fresher angles each round and answer the strongest point directly.",
    },
    rageMind,
    brainVersion: rageMind.brain?.version ?? BRAIN_VERSION,
    panel,
    // Phase 1 fusion scaffold: records provenance of the final (creator/opponent)
    // scores WITHOUT altering them — the winner above was already computed from
    // these same objects, so outcomes are identical by construction.
    fusion: buildPassThroughFusion(creator, opponent),
  };
}

function buildAdvancedForJudge(input: JudgeInput, result: JudgeResult): AdvancedAiReport {
  return buildAdvancedAiReport({
    battle: {
      id: input.battleId,
      title: input.title,
      topic: input.topic,
      battleType: input.battleType,
      mode: input.mode,
      rounds: Math.max(1, ...input.messages.map((message) => Number(message.round) || 1)),
      status: "completed",
      completedAt: new Date().toISOString(),
    },
    players: {
      creator: { side: "creator", userId: input.creatorId, username: input.creatorName },
      opponent: { side: "opponent", userId: input.opponentId, username: input.opponentName },
    },
    messages: input.messages.map((message) => ({
      side: message.user_id === input.creatorId ? "creator" : "opponent",
      userId: message.user_id,
      username: message.user_id === input.creatorId ? input.creatorName : input.opponentName,
      content: message.content,
      round: message.round,
      createdAt: message.created_at,
    })),
    scores: {
      creator: toAdvancedScoreRecord(result.scores.creator),
      opponent: toAdvancedScoreRecord(result.scores.opponent),
      winner: result.winner,
    },
  });
}

function toAdvancedScoreRecord(score: JudgeScore): Record<string, number | undefined> {
  return {
    creativity: score.creativity,
    logic: score.logic,
    humor: score.humor,
    originality: score.originality,
    comeback: score.comeback,
    entertainment: score.entertainment,
    relevance: score.relevance,
    counterarguments: score.counterarguments,
    consistency: score.consistency,
    adaptability: score.adaptability,
    confidence: score.confidence,
    audienceImpact: score.audienceImpact,
    topicAdherence: score.topicAdherence,
    conversationFlow: score.conversationFlow,
    participation: score.participation,
    total: score.total,
  };
}

/**
 * Conversation-graph adjustments: reward direct counters and callbacks,
 * penalize recycled jokes and letting attacks go unanswered. Bounded so a
 * graph signal refines — never replaces — the underlying category scores.
 */
function applyGraphAdjustments(score: JudgeScore, stats: SideGraphStats, style: string) {
  score.comeback = clampScore((score.comeback ?? 0) + Math.min(15, stats.directCounters * 5));
  score.counterarguments = clampScore((score.counterarguments ?? 0) + Math.min(12, stats.directCounters * 4));
  score.originality = clampScore((score.originality ?? 0) - Math.min(24, stats.reusedLines * 8));
  score.creativity = clampScore((score.creativity ?? 0) + Math.min(9, stats.callbacks * 3) - Math.min(12, stats.reusedLines * 4));
  score.conversationFlow = clampScore(
    (score.conversationFlow ?? 0) + Math.min(12, stats.directCounters * 3) - Math.min(16, stats.unansweredAttacksReceived * 4)
  );
  score.audienceImpact = clampScore((score.audienceImpact ?? 0) + Math.min(9, stats.attacksLandedUnanswered * 3));
  score.total = weightedTotal(score, style);
}

function scoreMessages(messages: string[], rageMind: RageMindReport, side: "creator" | "opponent"): JudgeScore {
  const text = messages.join(" ");
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  const uniqueRatio = new Set(words).size / Math.max(words.length, 1);
  const avgLength = text.length / Math.max(messages.length, 1);
  const emotionBoost = (rageMind.emotionEngine[side]?.length ?? 0) * 3;
  const personalityBoost = (rageMind.personalityEngine[side]?.length ?? 0) * 2;
  const base = Math.min(88, 38 + avgLength / 5 + uniqueRatio * 35 + emotionBoost + personalityBoost);

  const raw: JudgeScore = {
    creativity: clampScore(base + (rageMind.slangEngine.detected.length ? 5 : 0)),
    logic: clampScore(45 + countHits(text, /\b(because|therefore|logic|evidence|point|reason)\b/gi) * 8),
    humor: clampScore(base + countHits(text, /\b(lol|haha|wild|cook|cooked|ratio|bro)\b/gi) * 5),
    originality: clampScore(35 + uniqueRatio * 60),
    comeback: clampScore(base + countHits(text, /\b(but|you said|your point|actually|still)\b/gi) * 5),
    entertainment: clampScore(base + (rageMind.memeEngine.references.length ? 5 : 0)),
    relevance: clampScore(58 + countHits(text, new RegExp(escapeRegExp(rageMind.battleStyle), "gi")) * 3),
    counterarguments: clampScore(45 + countHits(text, /\b(but|because|actually|your|you said)\b/gi) * 6),
    consistency: clampScore(62 + uniqueRatio * 18),
    adaptability: clampScore(55 + Math.min(25, messages.length * 5)),
    confidence: clampScore(55 + countHits(text, /\b(clearly|obvious|watch|sure|easy)\b/gi) * 5),
    audienceImpact: clampScore(base + countHits(text, /[!?]/g) * 3),
    topicAdherence: 65,
    conversationFlow: 60,
    // Heuristic participation: players with real, varied messages land well
    // above the 40-point penalty line; empty/repetitive spam drops below it.
    participation: clampScore(30 + uniqueRatio * 45 + Math.min(20, messages.length * 4)),
    total: 0,
  };
  raw.total = weightedTotal(raw, rageMind.battleStyle);
  return raw;
}

function bestLine(messages: string[]): string {
  return [...messages].sort((a, b) => b.length - a.length)[0] ?? "";
}

function worstLine(messages: string[]): string {
  return [...messages].sort((a, b) => a.length - b.length)[0] ?? "";
}

function countHits(text: string, pattern: RegExp): number {
  return text.match(pattern)?.length ?? 0;
}

function clampScore(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}...` : value;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
