import { sql } from "@/lib/db";
import type { BattleSide, RageMindInput, RageMindMessage } from "@/services/rageMind";
import { analyzeIntent, type IntentAnalysis } from "@/services/intentEngine";
import { fuseConversationContext, type ContextFusionAnalysis } from "@/services/contextFusion";
import { detectHiddenMeaning, type HiddenMeaningAnalysis } from "@/services/hiddenMeaning";
import { analyzeConversationFlow, type ConversationFlowAnalysis } from "@/services/conversationFlow";
import { analyzeRelationship, type RelationshipAnalysis } from "@/services/relationshipEngine";
import { analyzeHumanLogic, type HumanLogicAnalysis } from "@/services/humanLogic";
import { analyzeHumorDepth, type HumorDepthAnalysis } from "@/services/humorDepth";
import { analyzeEmotionTransitions, type EmotionTransitionAnalysis } from "@/services/emotionTransition";
import { predictHumanReactions, type ReactionPredictorAnalysis } from "@/services/reactionPredictor";

export interface CognitiveScore {
  understanding: number;
  logic: number;
  humor: number;
  creativity: number;
  context: number;
  emotion: number;
  audience: number;
  psychology: number;
  consistency: number;
  overall: number;
}

export interface AdaptiveMemoryAnalysis {
  recentSignals: Record<BattleSide, string[]>;
  importantEvents: string[];
  forgottenSignals: string[];
  priorityWeights: {
    recentBehavior: number;
    importantEvents: number;
    oldHistory: number;
  };
  summary: string;
}

export interface CulturalReasoningAnalysis {
  references: {
    movies: string[];
    anime: string[];
    gaming: string[];
    sports: string[];
    internet: string[];
    regional: string[];
    indianFestivals: string[];
    music: string[];
    history: string[];
  };
  densityScore: number;
  notes: string[];
}

export interface MultiLayerReasoningPoint {
  messageIndex: number;
  username: string;
  literalMeaning: string;
  hiddenMeaning: string;
  emotionalMeaning: string;
  humor: string;
  logic: string;
  audiencePerception: string;
  topicRelevance: string;
}

export interface SelfQuestioningCheck {
  question: string;
  answer: string;
  risk: "low" | "medium" | "high";
}

export interface ConsensusVote {
  agent: string;
  winner: BattleSide | "draw";
  confidence: number;
  reason: string;
}

export interface ConsensusAnalysis {
  votes: ConsensusVote[];
  winner: BattleSide | "draw";
  confidence: number;
  disagreement: string[];
  summary: string;
}

export interface DynamicKnowledgeAnalysis {
  staticModules: string[];
  liveModules: string[];
  routing: Record<string, "static" | "live">;
  notes: string[];
}

export interface CognitionExplanation {
  winner: BattleSide | "draw";
  reason: string;
  keyMoments: string[];
  strongestReply: string;
  weakestReply: string;
  turningPoint: string;
  confidence: number;
  alternativeInterpretation: string;
}

export interface EdgeCaseAnalysis {
  veryShortReplies: string[];
  emojiOnlyReplies: string[];
  mixedLanguage: string[];
  typosOrBrokenGrammar: string[];
  internetAbbreviations: string[];
  voiceToTextLikely: string[];
  summary: string;
}

export interface CognitionPerformance {
  cacheHit: boolean;
  durationMs: number;
  stageTimings: Record<string, number>;
  benchmark: {
    transcriptMessages: number;
    duplicateProcessingAvoided: boolean;
    executionMode: "cached" | "cold";
    optimizationNotes: string[];
  };
}

export interface RageCognitionReport {
  transcriptHash: string;
  source: "local" | "cache";
  intentEngine: IntentAnalysis;
  contextFusion: ContextFusionAnalysis;
  hiddenMeaning: HiddenMeaningAnalysis;
  conversationFlow: ConversationFlowAnalysis;
  relationshipEngine: RelationshipAnalysis;
  adaptiveMemory: AdaptiveMemoryAnalysis;
  humanLogic: HumanLogicAnalysis;
  humorDepth: HumorDepthAnalysis;
  emotionTransition: EmotionTransitionAnalysis;
  culturalReasoning: CulturalReasoningAnalysis;
  multiLayerReasoning: MultiLayerReasoningPoint[];
  reactionPredictor: ReactionPredictorAnalysis;
  selfQuestioning: SelfQuestioningCheck[];
  consensus: ConsensusAnalysis;
  dynamicKnowledge: DynamicKnowledgeAnalysis;
  explanation: CognitionExplanation;
  cognitiveScore: CognitiveScore;
  edgeCases: EdgeCaseAnalysis;
  performance: CognitionPerformance;
}

export async function analyzeWithRageCognition(input: RageMindInput): Promise<RageCognitionReport> {
  const started = Date.now();
  const transcriptHash = await hashTranscript(input);
  const cached = input.battleId ? await readCachedReport(input.battleId, transcriptHash, started) : null;
  if (cached) return cached;

  const stageTimings: Record<string, number> = {};
  const intentEngine = timed(stageTimings, "intentEngine", () => analyzeIntent(input));
  const contextFusion = timed(stageTimings, "contextFusion", () => fuseConversationContext(input, intentEngine));
  const hiddenMeaning = timed(stageTimings, "hiddenMeaning", () => detectHiddenMeaning(input, contextFusion.fusedMessages));
  const conversationFlow = timed(stageTimings, "conversationFlow", () => analyzeConversationFlow(input));
  const [relationshipEngine] = await Promise.all([
    timedAsync(stageTimings, "relationshipEngine", () => analyzeRelationship(input)),
  ]);
  const humanLogic = timed(stageTimings, "humanLogic", () => analyzeHumanLogic(input));
  const humorDepth = timed(stageTimings, "humorDepth", () => analyzeHumorDepth(input));
  const emotionTransition = timed(stageTimings, "emotionTransition", () => analyzeEmotionTransitions(input));
  const reactionPredictor = timed(stageTimings, "reactionPredictor", () => predictHumanReactions(input));
  const culturalReasoning = timed(stageTimings, "culturalReasoning", () => analyzeCulture(input));
  const adaptiveMemory = timed(stageTimings, "adaptiveMemory", () =>
    buildAdaptiveMemory(input, conversationFlow, relationshipEngine, hiddenMeaning, emotionTransition)
  );
  const multiLayerReasoning = timed(stageTimings, "multiLayerReasoning", () =>
    buildMultiLayerReasoning(input, hiddenMeaning, humanLogic, humorDepth, emotionTransition, reactionPredictor)
  );
  const consensus = timed(stageTimings, "consensus", () =>
    buildConsensus(humanLogic, humorDepth, reactionPredictor, conversationFlow, emotionTransition)
  );
  const cognitiveScore = timed(stageTimings, "cognitiveScore", () =>
    buildCognitiveScore({
      intentEngine,
      contextFusion,
      hiddenMeaning,
      conversationFlow,
      relationshipEngine,
      humanLogic,
      humorDepth,
      emotionTransition,
      culturalReasoning,
      reactionPredictor,
    })
  );
  const selfQuestioning = timed(stageTimings, "selfQuestioning", () =>
    buildSelfQuestioning(input, hiddenMeaning, conversationFlow, emotionTransition, consensus)
  );
  const dynamicKnowledge = timed(stageTimings, "dynamicKnowledge", buildDynamicKnowledge);
  const edgeCases = timed(stageTimings, "edgeCases", () => analyzeEdgeCases(input, culturalReasoning));
  const explanation = timed(stageTimings, "explanation", () =>
    buildExplanation(input, consensus, cognitiveScore, conversationFlow, humanLogic, humorDepth, reactionPredictor)
  );

  const report: RageCognitionReport = {
    transcriptHash,
    source: "local",
    intentEngine,
    contextFusion,
    hiddenMeaning,
    conversationFlow,
    relationshipEngine,
    adaptiveMemory,
    humanLogic,
    humorDepth,
    emotionTransition,
    culturalReasoning,
    multiLayerReasoning,
    reactionPredictor,
    selfQuestioning,
    consensus,
    dynamicKnowledge,
    explanation,
    cognitiveScore,
    edgeCases,
    performance: buildPerformance(false, started, stageTimings, input.messages.length),
  };

  if (input.battleId) await cacheReport(input.battleId, transcriptHash, report);
  return report;
}

export async function updateRageCognitionMemory(input: RageMindInput, report: RageCognitionReport) {
  if (!input.battleId) return;

  try {
    for (const player of input.players) {
      const side = player.side;
      const profile = {
        cognitiveScore: report.cognitiveScore,
        dominantIntents: report.intentEngine.perSide[side],
        relationshipType: report.relationshipEngine.relationshipType,
        logicScore: report.humanLogic.perSideScore[side],
        humorScore: report.humorDepth.perSideScore[side],
        audienceScore: report.reactionPredictor.perSideAudienceScore[side],
        emotionalStability: report.emotionTransition.perSideStability[side],
        lastUpdatedFromBattle: input.battleId,
      };

      await sql`
        INSERT INTO player_cognition_memories (
          user_id, intent_patterns, logic_patterns, humor_patterns, emotional_transitions,
          cultural_references, relationship_history, key_events, cognitive_profile, updated_at
        ) VALUES (
          ${player.userId},
          ${JSON.stringify(report.intentEngine.perSide[side] ?? [])},
          ${JSON.stringify(report.humanLogic.signals.filter((signal) => signal.side === side).map((signal) => signal.explanation).slice(0, 8))},
          ${JSON.stringify(report.humorDepth.signals.filter((signal) => signal.side === side).map((signal) => signal.style).slice(0, 8))},
          ${JSON.stringify(report.emotionTransition.transitions.filter((transition) => transition.side === side).map((transition) => `${transition.from}->${transition.to}`).slice(0, 8))},
          ${JSON.stringify(report.culturalReasoning.notes.slice(0, 8))},
          ${JSON.stringify([report.relationshipEngine.summary])},
          ${JSON.stringify(report.adaptiveMemory.importantEvents.slice(0, 8))},
          ${JSON.stringify(profile)},
          now()
        )
        ON CONFLICT (user_id) DO UPDATE SET
          intent_patterns = merge_jsonb_arrays(player_cognition_memories.intent_patterns, EXCLUDED.intent_patterns),
          logic_patterns = merge_jsonb_arrays(player_cognition_memories.logic_patterns, EXCLUDED.logic_patterns),
          humor_patterns = merge_jsonb_arrays(player_cognition_memories.humor_patterns, EXCLUDED.humor_patterns),
          emotional_transitions = merge_jsonb_arrays(player_cognition_memories.emotional_transitions, EXCLUDED.emotional_transitions),
          cultural_references = merge_jsonb_arrays(player_cognition_memories.cultural_references, EXCLUDED.cultural_references),
          relationship_history = merge_jsonb_arrays(player_cognition_memories.relationship_history, EXCLUDED.relationship_history),
          key_events = merge_jsonb_arrays(player_cognition_memories.key_events, EXCLUDED.key_events),
          cognitive_profile = EXCLUDED.cognitive_profile,
          updated_at = now()
      `;
    }
  } catch (err) {
    console.warn("Rage Cognition memory update skipped:", err);
  }
}

function buildAdaptiveMemory(
  input: RageMindInput,
  flow: ConversationFlowAnalysis,
  relationship: RelationshipAnalysis,
  hidden: HiddenMeaningAnalysis,
  emotion: EmotionTransitionAnalysis
): AdaptiveMemoryAnalysis {
  const recentWindow = input.messages.slice(-4);
  const recentSignals = {
    creator: recentWindow.filter((message) => message.side === "creator").map((message) => `${message.username}: ${truncate(message.content, 120)}`),
    opponent: recentWindow.filter((message) => message.side === "opponent").map((message) => `${message.username}: ${truncate(message.content, 120)}`),
  };
  const importantEvents = [
    ...flow.momentum.sort((a, b) => b.score - a.score).slice(0, 2).map((point) => `${point.username} momentum spike in round ${point.round}.`),
    ...hidden.signals.slice(0, 2).map((signal) => `${signal.username}: ${signal.type.replace(/_/g, " ")}.`),
    ...emotion.transitions.slice(0, 2).map((transition) => `${transition.username}: ${transition.from} -> ${transition.to}.`),
  ];
  const forgottenSignals = input.messages.length > 6 ? input.messages.slice(0, -6).map((message) => `Older low-recency turn from ${message.username} weighted down.`).slice(0, 3) : [];

  return {
    recentSignals,
    importantEvents,
    forgottenSignals,
    priorityWeights: {
      recentBehavior: 0.55,
      importantEvents: relationship.battleHistoryCount > 0 ? 0.3 : 0.35,
      oldHistory: relationship.battleHistoryCount > 0 ? 0.15 : 0.1,
    },
    summary: "Recent behavior and high-impact turns are prioritized; older or low-signal history is kept but down-weighted.",
  };
}

function analyzeCulture(input: RageMindInput): CulturalReasoningAnalysis {
  const text = input.messages.map((message) => message.content).join(" ").toLowerCase();
  const references = {
    movies: findRefs(text, ["marvel", "dc", "kgf", "rrr", "pathaan", "bahubali", "joker", "thanos", "oppenheimer"]),
    anime: findRefs(text, ["naruto", "one piece", "luffy", "goku", "gojo", "jjk", "aot", "death note"]),
    gaming: findRefs(text, ["minecraft", "fortnite", "valorant", "pubg", "free fire", "gta", "elden ring", "boss fight"]),
    sports: findRefs(text, ["cricket", "ipl", "rcb", "csk", "kohli", "dhoni", "football", "messi", "ronaldo", "world cup"]),
    internet: findRefs(text, ["ratio", "npc", "brainrot", "skibidi", "sigma", "ohio", "gyatt", "rizz", "meme"]),
    regional: findRefs(text, ["bhai", "yaar", "anna", "macha", "ra", "da", "guru", "bhau", "dada"]),
    indianFestivals: findRefs(text, ["diwali", "holi", "eid", "pongal", "onam", "dussehra", "ganesh chaturthi", "rakhi"]),
    music: findRefs(text, ["diss track", "rap", "bars", "beat", "drake", "kendrick", "arijit", "sidhu"]),
    history: findRefs(text, ["mughal", "british", "independence", "ashoka", "chanakya", "world war", "empire"]),
  };
  const allRefs = Object.values(references).flat();
  return {
    references,
    densityScore: clamp(18 + allRefs.length * 12),
    notes: allRefs.length
      ? allRefs.slice(0, 8).map((ref) => `${ref} is cultural context; judge whether the audience would understand the reference.`)
      : ["No explicit cultural reference detected; rely on direct meaning and battle context."],
  };
}

function buildMultiLayerReasoning(
  input: RageMindInput,
  hidden: HiddenMeaningAnalysis,
  logic: HumanLogicAnalysis,
  humor: HumorDepthAnalysis,
  emotion: EmotionTransitionAnalysis,
  reactions: ReactionPredictorAnalysis
): MultiLayerReasoningPoint[] {
  return input.messages.map((message, index) => {
    const hiddenSignal = hidden.signals.find((signal) => signal.messageIndex === index);
    const logicSignals = logic.signals.filter((signal) => signal.messageIndex === index);
    const humorSignal = humor.signals.find((signal) => signal.messageIndex === index);
    const reaction = reactions.messages.find((item) => item.messageIndex === index);
    const emotionalState = emotion.timeline[message.side].find((item) => item.round === message.round && item.content === truncate(message.content, 120));

    return {
      messageIndex: index,
      username: message.username,
      literalMeaning: truncate(message.content, 180),
      hiddenMeaning: hiddenSignal?.meaning ?? "No strong hidden layer detected.",
      emotionalMeaning: emotionalState ? `${emotionalState.state} (${emotionalState.intensity}/100 intensity)` : "Neutral or unclear.",
      humor: humorSignal ? `${humorSignal.style.replace(/_/g, " ")} humor` : "No deep humor signal.",
      logic: logicSignals.length ? logicSignals.map((signal) => signal.explanation).join("; ") : "No explicit reasoning or fallacy signal.",
      audiencePerception: reaction ? `${reaction.reactions.join(", ")} (${reaction.audienceScore}/100)` : "Unknown audience reaction.",
      topicRelevance: topicRelevance(message, input.topic),
    };
  });
}

function buildConsensus(
  logic: HumanLogicAnalysis,
  humor: HumorDepthAnalysis,
  reactions: ReactionPredictorAnalysis,
  flow: ConversationFlowAnalysis,
  emotion: EmotionTransitionAnalysis
): ConsensusAnalysis {
  const votes: ConsensusVote[] = [
    voteFromScores("logic-agent", logic.perSideScore, "stronger reasoning and fewer fallacies"),
    voteFromScores("humor-agent", humor.perSideScore, "deeper humor with lower abusive-risk penalty"),
    voteFromScores("audience-agent", reactions.perSideAudienceScore, "stronger predicted human audience response"),
    voteFromMomentum(flow),
    voteFromScores("emotion-agent", emotion.perSideStability, "steadier emotional control under pressure"),
  ];
  const creatorVotes = votes.filter((vote) => vote.winner === "creator").length;
  const opponentVotes = votes.filter((vote) => vote.winner === "opponent").length;
  const winner: BattleSide | "draw" = creatorVotes === opponentVotes ? "draw" : creatorVotes > opponentVotes ? "creator" : "opponent";
  const disagreement = votes
    .filter((vote) => vote.winner !== winner && vote.winner !== "draw")
    .map((vote) => `${vote.agent} preferred ${vote.winner}: ${vote.reason}`);
  const confidence = clamp(52 + Math.abs(creatorVotes - opponentVotes) * 9 + average(votes.map((vote) => vote.confidence)) * 0.2 - disagreement.length * 4);

  return {
    votes,
    winner,
    confidence,
    disagreement,
    summary: winner === "draw" ? "Cognition agents are split, so the judge should be conservative." : `Cognition agents lean ${winner} with ${confidence}% consensus confidence.`,
  };
}

function buildCognitiveScore(parts: {
  intentEngine: IntentAnalysis;
  contextFusion: ContextFusionAnalysis;
  hiddenMeaning: HiddenMeaningAnalysis;
  conversationFlow: ConversationFlowAnalysis;
  relationshipEngine: RelationshipAnalysis;
  humanLogic: HumanLogicAnalysis;
  humorDepth: HumorDepthAnalysis;
  emotionTransition: EmotionTransitionAnalysis;
  culturalReasoning: CulturalReasoningAnalysis;
  reactionPredictor: ReactionPredictorAnalysis;
}): CognitiveScore {
  const understanding = clamp(average(parts.intentEngine.messages.map((message) => message.confidence)) * 0.7 + Math.min(30, parts.hiddenMeaning.signals.length * 6));
  const logic = average(Object.values(parts.humanLogic.perSideScore));
  const humor = average(Object.values(parts.humorDepth.perSideScore));
  const creativity = clamp(42 + parts.culturalReasoning.densityScore * 0.25 + parts.hiddenMeaning.signals.length * 5 + parts.humorDepth.signals.length * 4);
  const context = clamp(52 + parts.contextFusion.fusedMessages.flatMap((message) => message.callbackSignals).length * 7 + parts.conversationFlow.momentum.length * 2);
  const emotion = average(Object.values(parts.emotionTransition.perSideStability));
  const audience = average(Object.values(parts.reactionPredictor.perSideAudienceScore));
  const psychology = clamp(parts.relationshipEngine.confidence * 0.45 + parts.relationshipEngine.rivalryScore * 0.35 + parts.conversationFlow.pressure.length * 5);
  const consistency = clamp(92 - parts.conversationFlow.repeatingArguments.length * 10 - parts.conversationFlow.contradictions.length * 12 - parts.conversationFlow.loops.length * 10);
  const overall = average([understanding, logic, humor, creativity, context, emotion, audience, psychology, consistency]);

  return {
    understanding,
    logic,
    humor,
    creativity,
    context,
    emotion,
    audience,
    psychology,
    consistency,
    overall,
  };
}

function buildSelfQuestioning(
  input: RageMindInput,
  hidden: HiddenMeaningAnalysis,
  flow: ConversationFlowAnalysis,
  emotion: EmotionTransitionAnalysis,
  consensus: ConsensusAnalysis
): SelfQuestioningCheck[] {
  return [
    {
      question: "Did I misunderstand the literal message?",
      answer: input.messages.some((message) => message.content.length < 12)
        ? "Some short replies need context from prior turns before judging."
        : "Enough text exists for literal interpretation, but context still matters.",
      risk: input.messages.some((message) => message.content.length < 12) ? "medium" : "low",
    },
    {
      question: "Is there another interpretation?",
      answer: hidden.signals.length ? "Yes. Hidden meaning, sarcasm, or symbolic language was detected." : "No strong alternate hidden layer was detected.",
      risk: hidden.signals.length ? "medium" : "low",
    },
    {
      question: "Did context change?",
      answer: flow.momentum.length > 2 || flow.topicDrift.length ? flow.summary : "No major context change detected.",
      risk: flow.topicDrift.length ? "medium" : "low",
    },
    {
      question: "Did sarcasm affect meaning?",
      answer: hidden.signals.some((signal) => signal.type === "passive_aggression" || signal.type === "backhand_compliment")
        ? "Sarcasm or mock praise may invert the surface meaning."
        : "No high-confidence sarcasm inversion detected.",
      risk: hidden.signals.some((signal) => signal.type === "passive_aggression") ? "medium" : "low",
    },
    {
      question: "Do reasoning agents disagree?",
      answer: consensus.disagreement.length ? consensus.disagreement.join(" ") : "Consensus agents mostly agree.",
      risk: consensus.disagreement.length >= 2 ? "high" : consensus.disagreement.length ? "medium" : "low",
    },
    {
      question: "Did emotion shift the verdict?",
      answer: emotion.transitions.length ? emotion.summary : "No major emotional shift changes the read.",
      risk: emotion.transitions.length > 2 ? "medium" : "low",
    },
  ];
}

function buildDynamicKnowledge(): DynamicKnowledgeAnalysis {
  const staticModules = ["language", "humor", "logic", "psychology", "relationship"];
  const liveModules = ["internet", "gaming", "movies", "sports", "regional culture"];
  return {
    staticModules,
    liveModules,
    routing: {
      language: "static",
      humor: "static",
      logic: "static",
      psychology: "static",
      internet: "live",
      gaming: "live",
      movies: "live",
      sports: "live",
      culture: "live",
    },
    notes: [
      "Static modules are deterministic and safe for latency-sensitive judging.",
      "Live modules are separated so future connectors can refresh fast-moving memes, sports, and pop culture without changing core logic.",
    ],
  };
}

function analyzeEdgeCases(input: RageMindInput, culture: CulturalReasoningAnalysis): EdgeCaseAnalysis {
  const veryShortReplies = input.messages
    .filter((message) => message.content.trim().split(/\s+/).filter(Boolean).length <= 3)
    .map((message) => `${message.username}, round ${message.round}: very short reply needs inherited context.`);
  const emojiOnlyReplies = input.messages
    .filter((message) => /^[\p{Emoji}\s]+$/u.test(message.content.trim()) && message.content.trim().length > 0)
    .map((message) => `${message.username}, round ${message.round}: emoji-only reply.`);
  const internetAbbreviations = input.messages
    .filter((message) => /\b(lol|lmao|idk|imo|fr|ngl|btw|iykyk|smh)\b/i.test(message.content))
    .map((message) => `${message.username}, round ${message.round}: internet abbreviation detected.`);
  const typosOrBrokenGrammar = input.messages
    .filter((message) => /\b(teh|dont|wont|ur|u|becoz|bcuz)\b/i.test(message.content))
    .map((message) => `${message.username}, round ${message.round}: typo or informal grammar should not be penalized by itself.`);
  const voiceToTextLikely = input.messages
    .filter((message) => /\b(comma|period|question mark|exclamation mark)\b/i.test(message.content))
    .map((message) => `${message.username}, round ${message.round}: possible voice-to-text artifact.`);
  const mixedLanguage = culture.references.regional.length
    ? [`Regional terms detected: ${culture.references.regional.join(", ")}. Interpret culturally, not as grammar errors.`]
    : [];

  return {
    veryShortReplies,
    emojiOnlyReplies,
    mixedLanguage,
    typosOrBrokenGrammar,
    internetAbbreviations,
    voiceToTextLikely,
    summary: "Edge cases are normalized before scoring so brevity, slang, mixed language, and informal typing do not get unfairly punished.",
  };
}

function buildExplanation(
  input: RageMindInput,
  consensus: ConsensusAnalysis,
  score: CognitiveScore,
  flow: ConversationFlowAnalysis,
  logic: HumanLogicAnalysis,
  humor: HumorDepthAnalysis,
  reactions: ReactionPredictorAnalysis
): CognitionExplanation {
  const strongestReply = strongestReplyFrom(input, logic, humor, reactions);
  const weakestReply = weakestReplyFrom(input, logic, reactions);
  const turningPoint = flow.momentum.sort((a, b) => b.score - a.score)[0];
  return {
    winner: consensus.winner,
    reason:
      consensus.winner === "draw"
        ? "Cognition agents disagreed enough that the final judge should treat this as close."
        : `${consensus.winner} leads the cognition read through context, logic, humor, emotion, and predicted audience response.`,
    keyMoments: [
      flow.summary,
      logic.strongestReasoning,
      humor.bestHumor,
      reactions.summary,
    ].filter(Boolean).slice(0, 6),
    strongestReply,
    weakestReply,
    turningPoint: turningPoint ? `${turningPoint.username}, round ${turningPoint.round}: ${turningPoint.reason}.` : "No clear turning point.",
    confidence: clamp((consensus.confidence + score.overall) / 2),
    alternativeInterpretation: consensus.disagreement.length
      ? `Alternative read: ${consensus.disagreement.join(" ")}`
      : "No major alternative interpretation, though sarcasm and context should still be checked before final verdict.",
  };
}

function voteFromScores(agent: string, scores: Record<BattleSide, number>, reason: string): ConsensusVote {
  const diff = Math.abs(scores.creator - scores.opponent);
  const winner: BattleSide | "draw" = diff <= 3 ? "draw" : scores.creator > scores.opponent ? "creator" : "opponent";
  return {
    agent,
    winner,
    confidence: clamp(48 + diff * 1.8),
    reason,
  };
}

function voteFromMomentum(flow: ConversationFlowAnalysis): ConsensusVote {
  const bySide = {
    creator: average(flow.momentum.filter((point) => point.side === "creator").map((point) => point.score)),
    opponent: average(flow.momentum.filter((point) => point.side === "opponent").map((point) => point.score)),
  };
  return voteFromScores("flow-agent", bySide, "better momentum, recovery, and conversation control");
}

function topicRelevance(message: RageMindMessage, topic: string): string {
  const topicWords = topic.toLowerCase().split(/\s+/).filter((word) => word.length > 3);
  if (!topicWords.length) return "Topic relevance unclear.";
  const normalized = message.content.toLowerCase();
  return topicWords.some((word) => normalized.includes(word))
    ? "Directly touches the battle topic."
    : "Needs inherited context to connect back to the topic.";
}

function strongestReplyFrom(input: RageMindInput, logic: HumanLogicAnalysis, humor: HumorDepthAnalysis, reactions: ReactionPredictorAnalysis): string {
  const ranked = input.messages
    .map((message, index) => {
      const logicBoost = logic.signals.filter((signal) => signal.messageIndex === index && signal.type === "strong_reasoning").length * 18;
      const humorBoost = humor.signals.filter((signal) => signal.messageIndex === index).reduce((sum, signal) => sum + signal.score, 0) * 0.2;
      const audience = reactions.messages.find((reaction) => reaction.messageIndex === index)?.audienceScore ?? 0;
      return { message, score: logicBoost + humorBoost + audience + Math.min(20, message.content.length / 12) };
    })
    .sort((a, b) => b.score - a.score);
  const best = ranked[0]?.message;
  return best ? `${best.username}, round ${best.round}: "${truncate(best.content, 220)}"` : "";
}

function weakestReplyFrom(input: RageMindInput, logic: HumanLogicAnalysis, reactions: ReactionPredictorAnalysis): string {
  const ranked = input.messages
    .map((message, index) => {
      const fallacyPenalty = logic.signals
        .filter((signal) => signal.messageIndex === index && signal.type !== "strong_reasoning")
        .reduce((sum, signal) => sum + signal.severity, 0);
      const audience = reactions.messages.find((reaction) => reaction.messageIndex === index)?.audienceScore ?? 0;
      return { message, score: audience - fallacyPenalty + Math.min(14, message.content.length / 20) };
    })
    .sort((a, b) => a.score - b.score);
  const weakest = ranked[0]?.message;
  return weakest ? `${weakest.username}, round ${weakest.round}: "${truncate(weakest.content, 220)}"` : "";
}

function findRefs(text: string, refs: string[]): string[] {
  return refs.filter((ref) => text.includes(ref));
}

function buildPerformance(cacheHit: boolean, started: number, stageTimings: Record<string, number>, transcriptMessages: number): CognitionPerformance {
  return {
    cacheHit,
    durationMs: Date.now() - started,
    stageTimings,
    benchmark: {
      transcriptMessages,
      duplicateProcessingAvoided: cacheHit,
      executionMode: cacheHit ? "cached" : "cold",
      optimizationNotes: cacheHit
        ? ["Reused cached cognition report for identical battle transcript."]
        : [
            "Deterministic modules avoid extra network latency.",
            "Database-backed relationship lookup runs separately from CPU-only analysis.",
            "Transcript hash prevents duplicate reasoning for unchanged battles.",
          ],
    },
  };
}

async function readCachedReport(battleId: string, transcriptHash: string, started: number): Promise<RageCognitionReport | null> {
  try {
    const rows = await sql`
      SELECT payload FROM rage_cognition_cache
      WHERE battle_id = ${battleId} AND transcript_hash = ${transcriptHash}
        AND expires_at > now()
      ORDER BY generated_at DESC
      LIMIT 1
    `;
    const payload = rows[0]?.payload as RageCognitionReport | undefined;
    if (!payload) return null;
    return {
      ...payload,
      source: "cache",
      performance: buildPerformance(true, started, payload.performance?.stageTimings ?? {}, payload.performance?.benchmark?.transcriptMessages ?? 0),
    };
  } catch {
    return null;
  }
}

async function cacheReport(battleId: string, transcriptHash: string, report: RageCognitionReport) {
  try {
    await sql`
      INSERT INTO rage_cognition_cache (battle_id, transcript_hash, payload, expires_at)
      VALUES (${battleId}, ${transcriptHash}, ${JSON.stringify(report)}, now() + interval '14 days')
      ON CONFLICT (battle_id, transcript_hash) DO UPDATE SET
        payload = EXCLUDED.payload,
        generated_at = now(),
        expires_at = EXCLUDED.expires_at
    `;

    await sql`
      INSERT INTO battle_cognition_reports (battle_id, transcript_hash, payload, cognitive_score)
      VALUES (${battleId}, ${transcriptHash}, ${JSON.stringify(report)}, ${JSON.stringify(report.cognitiveScore)})
      ON CONFLICT (battle_id) DO UPDATE SET
        transcript_hash = EXCLUDED.transcript_hash,
        payload = EXCLUDED.payload,
        cognitive_score = EXCLUDED.cognitive_score,
        generated_at = now()
    `;
  } catch (err) {
    console.warn("Rage Cognition cache write skipped:", err);
  }
}

async function hashTranscript(input: RageMindInput): Promise<string> {
  const data = JSON.stringify({
    title: input.title,
    topic: input.topic,
    battleType: input.battleType,
    mode: input.mode,
    players: input.players.map((player) => [player.side, player.userId, player.username]),
    messages: input.messages.map((message) => [message.side, message.userId, message.round, message.content]),
  });

  if (globalThis.crypto?.subtle) {
    const bytes = new TextEncoder().encode(data);
    const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  return String(data.length) + ":" + data.slice(0, 120);
}

function timed<T>(stageTimings: Record<string, number>, label: string, run: () => T): T {
  const started = Date.now();
  try {
    return run();
  } finally {
    stageTimings[label] = Date.now() - started;
  }
}

async function timedAsync<T>(stageTimings: Record<string, number>, label: string, run: () => Promise<T>): Promise<T> {
  const started = Date.now();
  try {
    return await run();
  } finally {
    stageTimings[label] = Date.now() - started;
  }
}

function average(values: number[]): number {
  if (!values.length) return 0;
  return clamp(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function clamp(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}...` : value;
}
